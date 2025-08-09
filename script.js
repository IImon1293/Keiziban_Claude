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

// Reference to the likes collection
const likesRef = db.collection('pracClass').doc('iimon').collection('apps').doc('keiziban').collection('likes');

// Get or generate unique user ID
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

const currentUserId = getUserId();

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
            const data = doc.data();
            // Only add top-level posts (not replies) to the main timeline
            if (!data.parent_id) {
                posts.push({
                    id: doc.id,
                    ...data
                });
            }
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
        
        // Load replies and likes for this post
        if (!post.parent_id) {
            loadReplies(post.id);
            loadLikes(post.id);
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

    const isOwner = post.userId === currentUserId;
    const editedText = post.edited ? ' (編集済み)' : '';

    postDiv.innerHTML = `
        <div class="tweet-header">
            <div class="tweet-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="tweet-content">
                <div class="tweet-meta">
                    <span class="tweet-author">${escapeHtml(post.author)}</span>
                    <span class="tweet-date">· ${date}${editedText}</span>
                    ${isOwner && !isReply ? `
                        <div class="tweet-menu">
                            <button class="menu-button" onclick="toggleMenu('${post.id}')">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <div class="menu-dropdown" id="menu-${post.id}" style="display: none;">
                                <button onclick="editPost('${post.id}')">編集</button>
                                <button onclick="deletePost('${post.id}')" class="delete-button">削除</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="tweet-text" id="text-${post.id}">${escapeHtml(post.content)}</div>
                ${!isReply ? `
                <div class="tweet-actions">
                    <button class="action-button reply-button" onclick="showReplyForm('${post.id}')">
                        <i class="far fa-comment"></i>
                        <span class="reply-count" id="reply-count-${post.id}">0</span>
                    </button>
                    <button class="action-button like-button" onclick="toggleLike('${post.id}')" id="like-button-${post.id}">
                        <i class="far fa-heart" id="like-icon-${post.id}"></i>
                        <span class="like-count" id="like-count-${post.id}">0</span>
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
            parent_id: null,
            userId: currentUserId,
            edited: false,
            likeCount: 0
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
            parent_id: parentId,
            userId: currentUserId,
            edited: false,
            likeCount: 0
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

// Toggle menu dropdown
function toggleMenu(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-button')) {
        document.querySelectorAll('.menu-dropdown').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Edit post
function editPost(postId) {
    const textElement = document.getElementById(`text-${postId}`);
    const currentText = textElement.innerText;
    
    const newContent = prompt('投稿を編集:', currentText);
    
    if (newContent !== null && newContent.trim() !== '' && newContent !== currentText) {
        postsRef.doc(postId).update({
            content: newContent.trim(),
            edited: true,
            edited_at: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => {
            console.error('Error editing post:', error);
            alert('編集に失敗しました。');
        });
    }
}

// Delete post
function deletePost(postId) {
    if (confirm('この投稿を削除してもよろしいですか？')) {
        // Delete the post
        postsRef.doc(postId).delete().then(() => {
            // Delete all replies
            postsRef.where('parent_id', '==', postId).get().then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            });
        }).catch(error => {
            console.error('Error deleting post:', error);
            alert('削除に失敗しました。');
        });
    }
}

// Load likes for a post
function loadLikes(postId) {
    likesRef.doc(postId).onSnapshot((doc) => {
        const likeCountElement = document.getElementById(`like-count-${postId}`);
        const likeIconElement = document.getElementById(`like-icon-${postId}`);
        const likeButtonElement = document.getElementById(`like-button-${postId}`);
        
        if (doc.exists) {
            const data = doc.data();
            const likeCount = data.users ? data.users.length : 0;
            const isLiked = data.users && data.users.includes(currentUserId);
            
            if (likeCountElement) {
                likeCountElement.textContent = likeCount;
            }
            
            if (likeIconElement && isLiked) {
                likeIconElement.className = 'fas fa-heart';
                if (likeButtonElement) {
                    likeButtonElement.classList.add('liked');
                }
            }
        } else {
            if (likeCountElement) {
                likeCountElement.textContent = '0';
            }
        }
    });
}

// Toggle like on a post
async function toggleLike(postId) {
    try {
        const likeDoc = await likesRef.doc(postId).get();
        
        if (likeDoc.exists) {
            const data = likeDoc.data();
            const users = data.users || [];
            
            if (users.includes(currentUserId)) {
                // Unlike
                await likesRef.doc(postId).update({
                    users: firebase.firestore.FieldValue.arrayRemove(currentUserId)
                });
            } else {
                // Like
                await likesRef.doc(postId).update({
                    users: firebase.firestore.FieldValue.arrayUnion(currentUserId)
                });
            }
        } else {
            // First like
            await likesRef.doc(postId).set({
                users: [currentUserId]
            });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}