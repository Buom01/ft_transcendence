//const socket = io();

async function _fetch(url) {
  return await fetch(url).then((res) => res.json());
}

function connection() {
  const modal = new bootstrap.Modal(
    document.getElementById('connectionModal'),
    {
      backdrop: true,
      keyboard: false,
      focus: true,
    },
  );
  modal.show();
  const connectionForm = document.getElementById('connection');
  connectionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const data = await _fetch(
      `http://localhost:80/user/username/${connectionForm.elements['username'].value}`,
    );
    if (!data.user.length) {
      connectionForm.querySelector('.alert').innerText =
        'This account not exist';
      return;
    }
    localStorage.setItem('user', JSON.stringify(data.user[0]));
    printChannel();
    modal.hide();
  });
}

async function printChannel() {
  const user = JSON.parse(localStorage.getItem('user'));
  const data = await _fetch(`http://localhost:80/chat/channel/get/${user.id}`);
  data.channel.forEach((el) => {
    const li = document.createElement('div');
    li.classList.add('channel-element');
    li.setAttribute('data-id', el.id);
    li.innerText = el.name;
    document.getElementById('channel-list').appendChild(li);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('user')) connection();
  printChannel();
});
/*
document.getElementById('currentName').innerText = `Your name: ${Name}`;
socket.emit('chat:join', Name);

window.addEventListener('beforeunload', () => {
  socket.emit('chat:quit', Name);
});

document.getElementById('sendMessage').addEventListener('submit', (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  const form = document.getElementById('sendMessage');
  const message = {
    name: Name,
    message: form.elements['message'].value,
  };
  if (form.elements['message'].value.length <= 0) return;
  socket.emit('chat:send', message);
  form.elements['message'].value = '';
});

socket.on('chat:join', (name) => {
  if (name !== Name)
    printMessage({ name, message: 'has joined the chat' }, !!(name === Name));
});

socket.on('chat:quit', (name) => {
  printMessage({ name, message: 'has left the chat' }, false, true);
});

socket.on('chat:send', (msg) => {
  printMessage(msg, !!(msg.name === Name));
});

const printMessage = (mes, isYou = true, isError = false) => {
  const node = document.createElement('div');
  node.classList.add('message');
  if (isYou) node.classList.add('you');
  if (isError) node.classList.add('error');
  const h4 = document.createElement('h5');
  h4.innerText = mes.name;
  const p = document.createElement('p');
  p.innerText = mes.message;
  node.appendChild(h4);
  node.appendChild(p);
  document.getElementById('messages').appendChild(node);
};
*/
