// const PubNub = require('pubnub')

// const credentials = {
//     publishKey: 'pub-c-ca77a660-b447-494e-9a21-37871992d267',
//     subscribeKey: 'sub-c-fb2b22b2-f171-11ea-8da6-961d8ae7f76b',
//     secretKey: 'sec-c-MDViODFkMjgtYjBhMC00NmU1LWI1NDEtYjg5YjdkMmNkY2Ez'
// }

// const CHANNELS = {
//     TEST: 'TEST',
//     TESTTWO: 'TESTTWO'
// }

// class PubSub{
//     constructor() {
//         this.pubnub = new PubNub(credentials)

//         this.pubnub.subscribe({channels: Object.values(CHANNELS)})

//         this.pubnub.addListener(this.listener())
//     }

//     listener(){
//         return{
//             message: messageObject =>{
//             const {channel, message} = messageObject

//             console.log(`Message received. Channel: ${channel}. Message: ${message}`)
//             }
//         }
//     }

//     publish({channel, message}) {
//         this.pubnub.publish({channel, message})
//     }
// }

// const testPubSub = new PubSub()
// testPubSub.publish({channel: CHANNELS.TEST, message: 'hello pubnub'})

// module.exports = PubSub



const redis = require('redis')

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
}

class PubSub {
    constructor({blockchain, transactionPool, redisUrl}) {
        this.blockchain = blockchain
        this.transactionPool = transactionPool

        this.publisher = redis.createClient(redisUrl)
        this.subscriber = redis.createClient(redisUrl)

        this.subscribeToChannels()

        this.subscriber.on('message', (channel, message)=>this.handleMessage(channel, message))
    }

    handleMessage(channel, message) {
        console.log(`Message received. Channel: ${channel}. Message: ${message}.`)
        const parsedMessage = JSON.parse(message)

        switch(channel) {
            case CHANNELS.BLOCKCHAIN:
              this.blockchain.replaceChain(parsedMessage, true, () => {
                this.transactionPool.clearBlockchainTransactions({
                  chain: parsedMessage
                });
              });
              break;
            case CHANNELS.TRANSACTION:
              this.transactionPool.setTransaction(parsedMessage);
              break;
            default:
              return;
          }
        }

    subscribeToChannels(){
        Object.values(CHANNELS).forEach(channel=>{
            this.subscriber.subscribe(channel)
        })
    }

    publish({channel, message}){
        this.subscriber.unsubscribe(channel, ()=>{
            this.publisher.publish(channel,message, ()=>{
                this.subscriber.subscribe(channel)
            })
        })        
    }

    broadcastChain(){
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        })
    }

    broadcastTransaction(transaction){
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        })
    }
}

module.exports = PubSub