const path = require('path');

const {PubSub} = require('@google-cloud/pubsub');

const projectId = 'serjava-demo';
const subscriptionNameOrId = 'grupo-j';
const keyFilename = path.join(__dirname, 'sa-grupo-j-key.json');
const timeout = Number(process.argv[2]) || 0;

const pubSubClient = new PubSub({projectId, keyFilename});

function listenForMessages(subscriptionNameOrId, timeout) {
  const subscription = pubSubClient.subscription(subscriptionNameOrId);

  let messageCount = 0;
  const messageHandler = message => {
    console.log(`Received message ${message.id}:`);
    console.log(`\tData: ${message.data}`);
    console.log(`\tAttributes: ${JSON.stringify(message.attributes)}`);
    messageCount += 1;

    message.ack();
  };

  subscription.on('message', messageHandler);

  subscription.on('error', error => {
    console.error('Erro na assinatura:', error.message);
  });

  console.log(`Aguardando mensagens em projects/${projectId}/subscriptions/${subscriptionNameOrId}...`);

  if (timeout > 0) {
    setTimeout(() => {
      subscription.removeListener('message', messageHandler);
      subscription.close();
      console.log(`${messageCount} message(s) received.`);
    }, timeout * 1000);
  }
}

listenForMessages(subscriptionNameOrId, timeout);
