var socket = io.connect(window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + '/chat', { transports: ['polling'] });
var currentRecipientId = null;
var messageStore = {};

document.getElementById('userList').addEventListener('click', function(event) {
  if (event.target.classList.contains('user')) {
    document.querySelectorAll('.user').forEach(i => i.classList.remove('active'));
    event.target.classList.add('active');
    switchUser(event.target.getAttribute('data-user-id'));
  }
});

function switchUser(recipientId) {
  currentRecipientId = recipientId;
  if (!messageStore[recipientId]) {
    fetchAndDisplayHistory(recipientId);
  } else {
    displayMessages(recipientId);
  }
}

function fetchAndDisplayHistory(recipientId) {
  fetch(`/get-messages?recipient_id=${recipientId}`)
    .then(response => response.json())
    .then(data => {
      messageStore[recipientId] = data.messages.map(msg => ({
        userId: msg.sender_id.toString(),
        message: msg.content
      }));
      displayMessages(recipientId);
    });
}

function displayMessages(recipientId) {
  document.getElementById('chatWindow').innerHTML = '';
  var messages = messageStore[recipientId] || [];
  messages.forEach(function(msg) {
    appendMessage(msg.userId, msg.message, msg.userId === currentUserId.toString());
  });
}

socket.on('connect', function() {
  console.log('Connected to Socket.IO server.');
});

document.getElementById('sendButton').addEventListener('click', function() {
  var message = document.getElementById('messageInput').value;
  sendMessage(message);
  document.getElementById('messageInput').value = '';
});

document.getElementById('messageInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage(this.value);
    this.value = '';
  }
});

function sendMessage(message) {
  if (!currentRecipientId) {
    alert("Please select a recipient.");
    return;
  }

  // Optimistically display the message
  var messageId = 'msg_' + new Date().getTime();  // Unique ID for the message
  storeAndAppendMessage(currentUserId, currentRecipientId, message, true, messageId);

  socket.emit('send_message', {
    sender_id: currentUserId,
    recipient_id: currentRecipientId,
    message: message
  }, function(success) {
    if (!success) {
      // Remove the optimistic message and show error
      removeMessage(messageId);
      appendErrorMessage("Failed to send");
    }
  });
}

function storeAndAppendMessage(senderId, recipientId, message, isSender, messageId) {
  var messageId = messageId || 'msg_' + new Date().getTime();
  if (!messageStore[recipientId]) {
    messageStore[recipientId] = [];
  }

  messageStore[recipientId].push({ userId: senderId, message: message, isSender: isSender, messageId: messageId });

  if (currentRecipientId && (senderId == currentRecipientId || recipientId == currentRecipientId)) {
    appendMessage(senderId, message, isSender, messageId);
  }
}

function appendErrorMessage(errorMessage) {
  var errorElement = document.createElement('div');
  errorElement.className = 'message error-message';
  errorElement.innerHTML = errorMessage;
  document.getElementById('chatWindow').appendChild(errorElement);
}

function removeMessage(messageId) {
  var messageElement = document.getElementById(messageId);
  if (messageElement) {
    messageElement.remove();
  }
}

socket.on('receive_message', function(data) {
  storeAndAppendMessage(data.sender_id, data.recipient_id, data.message, data.sender_id === currentUserId);
});

function appendMessage(userId, message, isSender, messageId) {
  var messageElement = document.createElement('div');
  messageElement.id = messageId; // Set the unique ID
  messageElement.className = isSender ? 'message sent-message' : 'message received-message';
  messageElement.innerHTML = `<strong>${isSender ? 'Me' : userId}:</strong> ${message}`;

  document.getElementById('chatWindow').appendChild(messageElement);
  var chatWindow = document.getElementById('chatWindow');
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

