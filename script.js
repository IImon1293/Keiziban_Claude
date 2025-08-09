const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();

    document.getElementById('postForm').addEventListener('submit', handlePostSubmit);
    document.getElementById('replyForm').addEventListener('submit', handleReplySubmit);

    const modal = document.getElementById('replyModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});

async function loadPosts() {
    try {
        const response = await fetch(`${API_URL}/posts`);
        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function displayPosts(posts) {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '';

    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

function createPostElement(post, isReply = false) {
    const postDiv = document.createElement('div');
    postDiv.className = isReply ? 'reply' : 'post';
    postDiv.dataset.postId = post.id;

    const date = new Date(post.created_at).toLocaleString('ja-JP');

    postDiv.innerHTML = `
        <div class="post-header">
            <span class="post-author">${escapeHtml(post.author)}</span>
            <span class="post-date">${date}</span>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${!isReply ? `
            <div class="post-actions">
                <button class="reply-btn" onclick="showReplyModal(${post.id})">返信</button>
                <button class="show-replies-btn" onclick="toggleReplies(${post.id})">返信を表示</button>
            </div>
            <div class="replies" id="replies-${post.id}" style="display: none;"></div>
        ` : ''}
    `;

    return postDiv;
}

async function handlePostSubmit(e) {
    e.preventDefault();
    
    const author = document.getElementById('author').value;
    const content = document.getElementById('content').value;

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ author, content })
        });

        if (response.ok) {
            document.getElementById('postForm').reset();
            loadPosts();
        }
    } catch (error) {
        console.error('Error posting:', error);
    }
}

async function handleReplySubmit(e) {
    e.preventDefault();
    
    const parentId = document.getElementById('parentId').value;
    const author = document.getElementById('replyAuthor').value;
    const content = document.getElementById('replyContent').value;

    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ author, content, parent_id: parentId })
        });

        if (response.ok) {
            document.getElementById('replyForm').reset();
            document.getElementById('replyModal').style.display = 'none';
            
            const repliesContainer = document.getElementById(`replies-${parentId}`);
            if (repliesContainer.style.display !== 'none') {
                loadReplies(parentId);
            }
        }
    } catch (error) {
        console.error('Error posting reply:', error);
    }
}

function showReplyModal(postId) {
    document.getElementById('parentId').value = postId;
    document.getElementById('replyModal').style.display = 'block';
}

async function toggleReplies(postId) {
    const repliesContainer = document.getElementById(`replies-${postId}`);
    
    if (repliesContainer.style.display === 'none') {
        await loadReplies(postId);
        repliesContainer.style.display = 'block';
    } else {
        repliesContainer.style.display = 'none';
    }
}

async function loadReplies(postId) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/replies`);
        const replies = await response.json();
        
        const repliesContainer = document.getElementById(`replies-${postId}`);
        repliesContainer.innerHTML = '';
        
        replies.forEach(reply => {
            const replyElement = createPostElement(reply, true);
            repliesContainer.appendChild(replyElement);
        });
    } catch (error) {
        console.error('Error loading replies:', error);
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}