const posts = document.querySelector("#posts");
const pfp = document.querySelector("#pfp");

const handleLoad = async () => {
  const postsData = await getPosts();
  const userData = await getUserData();

  if (!userData.error) {
    pfp.src = userData.profile_pic;
    pfp.alt = `${userData.username}'s profile picture`;
  } else {
    pfp.style.display = "none";
  }

  for (const [_, v] of Object.entries(postsData.data)) {
    const post = renderPost(v);

    posts.appendChild(post);
  }
};

const getPosts = async () => {
  const req = await fetch("http://opinia-1z72.onrender.com/posts", {
    method: "GET",
  });
  const res = await req.json();

  return res;
};

const renderPost = (p) => {
  const post = document.createElement("div");
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  const tags = document.createElement("div");
  const content = document.createElement("p");
  const interactions = document.createElement("div");
  const likeBtn = document.createElement("button");
  const commentBtn = document.createElement("button");
  const likes = document.createElement("p");
  const comments = document.createElement("p");
  const pfp = document.createElement("img");

  post.appendChild(heading);
  post.appendChild(content);
  post.appendChild(interactions);
  post.classList.add("post");

  heading.appendChild(title);
  heading.appendChild(tags);

  title.textContent = p.post_title;
  title.classList.add("impact");

  const tag = document.createElement("p");
  tag.textContent = p.tag_id;
  tag.classList.add("tag");
  tag.classList.add("barlow-sc-medium");

  tags.appendChild(tag);

  content.textContent = p.post_content;
  content.classList.add("barlow-sc-medium");

  interactions.appendChild(likeBtn);
  interactions.appendChild(commentBtn);
  interactions.appendChild(likes);
  interactions.appendChild(comments);
  interactions.appendChild(pfp);
  interactions.classList.add("barlow-sc-medium");

  likeBtn.innerHTML = `<img src="../../assets/media/icons/like.svg" alt="Like">`;

  commentBtn.innerHTML = `<img src="../../assets/media/icons/comment.svg" alt="Open comments">`;

  likes.textContent = `${p.post_likes} likes`;
  likes.classList.add("gradient-text-v");

  comments.textContent = `${p.post_comments} comments`;
  comments.classList.add("gradient-text-v");

  pfp.src = p.user.profile_pic;
  pfp.alt = `${p.user.username}'s profile picture`;
  pfp.id = "pfp";

  return post;
};

const getUserData = async () => {
  const req = await fetch("http://opinia-1z72.onrender.com/me", {
    method: "GET",
  });
  const res = await req.json();

  return res;
};

window.addEventListener("load", handleLoad);
