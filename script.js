// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyChB7eBjMaX_lRpfIgUxQDi39Qh82R4oyQ",
    authDomain: "sandbox-35d1d.firebaseapp.com",
    projectId: "sandbox-35d1d",
    storageBucket: "sandbox-35d1d.appspot.com",
    messagingSenderId: "906287459396",
    appId: "1:906287459396:web:c931c95d943157cae36011",
    measurementId: "G-LE2Q0XC7B6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Reference to the posts collection
const postsRef = db.collection('pracClass').doc('iimon').collection('apps').doc('keiziban').collection('posts');

// DOM elements
let postsContainer;
let postForm;
let authorInput;
let contentInput;

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    postsContainer = document.getElementById('posts');
    postForm = document.getElementById('postForm');
    authorInput = document.getElementById('author');
    contentInput = document.getElementById('content');

    // Load saved author name from localStorage
    const savedAuthor = localStorage.getItem('authorName');
    if (savedAuthor) {
        authorInput.value = savedAuthor;
    }

    // Set up form submission
    postForm.addEventListener('submit', handlePostSubmit);

    // Set up real-time listener
    setupRealtimeListener();
});

// Set up real-time listener with onSnapshot
function setupRealtimeListener() {
    postsRef.orderBy('created_at', 'desc').onSnapshot((snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        displayPosts(posts);
    }, (error) => {
        console.error('Error listening to posts:', error);
    });
}

// Display posts in the timeline
function displayPosts(posts) {
    postsContainer.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
        
        // Load replies for this post
        if (!post.parent_id) {
            loadReplies(post.id);
        }
    });
}

// Create a post element
function createPostElement(post, isReply = false) {
    const postDiv = document.createElement('div');
    postDiv.className = isReply ? 'reply-tweet' : 'tweet';
    postDiv.dataset.postId = post.id;

    const date = post.created_at ? new Date(post.created_at.toDate()).toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '読み込み中...';

    postDiv.innerHTML = `
        <div class="tweet-header">
            <div class="tweet-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="tweet-content">
                <div class="tweet-meta">
                    <span class="tweet-author">${escapeHtml(post.author)}</span>
                    <span class="tweet-date">· ${date}</span>
                </div>
                <div class="tweet-text">${escapeHtml(post.content)}</div>
                ${!isReply ? `
                <div class="tweet-actions">
                    <button class="action-button reply-button" onclick="showReplyForm('${post.id}')">
                        <i class="far fa-comment"></i>
                        <span class="reply-count" id="reply-count-${post.id}">0</span>
                    </button>
                    <button class="action-button">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-button">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
                <div class="reply-form-container" id="reply-form-${post.id}" style="display: none;">
                    <form onsubmit="handleReplySubmit(event, '${post.id}')" class="inline-reply-form">
                        <div class="reply-form-content">
                            <input type="text" placeholder="名前（空欄の場合は名無しさん）" class="reply-author-input">
                            <textarea placeholder="返信を投稿" required class="reply-textarea" rows="2"></textarea>
                        </div>
                        <button type="submit" class="reply-submit-button">返信</button>
                    </form>
                </div>
                <div class="replies-container" id="replies-${post.id}"></div>
                ` : ''}
            </div>
        </div>
    `;

    return postDiv;
}

// Load replies for a post
function loadReplies(postId) {
    postsRef.where('parent_id', '==', postId)
        .orderBy('created_at', 'asc')
        .onSnapshot((snapshot) => {
            const replies = [];
            snapshot.forEach((doc) => {
                replies.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            const repliesContainer = document.getElementById(`replies-${postId}`);
            const replyCountElement = document.getElementById(`reply-count-${postId}`);
            
            if (repliesContainer) {
                repliesContainer.innerHTML = '';
                replies.forEach(reply => {
                    const replyElement = createPostElement(reply, true);
                    repliesContainer.appendChild(replyElement);
                });
            }
            
            if (replyCountElement) {
                replyCountElement.textContent = replies.length;
            }
        });
}

// Handle post submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    let author = authorInput.value.trim();
    const content = contentInput.value.trim();
    
    // Use default name if empty
    if (!author) {
        author = '名無しさん';
    } else {
        // Save author name to localStorage
        localStorage.setItem('authorName', author);
    }
    
    if (!content) return;
    
    try {
        await postsRef.add({
            author: author,
            content: content,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            parent_id: null
        });
        
        // Clear only content, keep author name
        contentInput.value = '';
    } catch (error) {
        console.error('Error posting:', error);
        alert('投稿に失敗しました。もう一度お試しください。');
    }
}

// Show reply form
function showReplyForm(postId) {
    const replyForm = document.getElementById(`reply-form-${postId}`);
    if (replyForm) {
        replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
        
        // Pre-fill saved author name in reply form
        const savedAuthor = localStorage.getItem('authorName');
        if (savedAuthor) {
            const authorInput = replyForm.querySelector('.reply-author-input');
            if (authorInput) {
                authorInput.value = savedAuthor;
            }
        }
    }
}

// Handle reply submission
async function handleReplySubmit(e, parentId) {
    e.preventDefault();
    
    const form = e.target;
    let author = form.querySelector('.reply-author-input').value.trim();
    const content = form.querySelector('.reply-textarea').value.trim();
    
    // Use default name if empty
    if (!author) {
        author = '名無しさん';
    } else {
        // Save author name to localStorage
        localStorage.setItem('authorName', author);
    }
    
    if (!content) return;
    
    try {
        await postsRef.add({
            author: author,
            content: content,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            parent_id: parentId
        });
        
        // Clear and hide form
        form.reset();
        document.getElementById(`reply-form-${parentId}`).style.display = 'none';
    } catch (error) {
        console.error('Error posting reply:', error);
        alert('返信の投稿に失敗しました。もう一度お試しください。');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}