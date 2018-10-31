'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
}

const commMgrClient = new cote.Requester({
    name: 'Elife-Invite -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}

let msKey = 'everlife-follower-svc'
/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager so we can handle requests for Everlife-Follower.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [
            { cmd: '/follow', txt: 'follow an avatar' },
            { cmd: '/unfollow', txt: 'unfollow an avatar' },
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {

    /*      understand/
     * The microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const svc = new cote.Responder({
        name: 'Everlife-Follower Service',
        key: msKey,
    })

    svc.on('msg', (req, cb) => {
        if(!req.msg) return cb()

        try {
            const rx = /^\/follow  *(.*)/i
            let m = req.msg.match(rx)
            if(!m) {
                const rex = /^\/unfollow  *(.*)/i
                let ms = req.msg.match(rex)
                if(!ms) return cb()
                else{
                    cb(null, true)
                    handleFollowUnFollow('unfollow-user',ms[1])
                    sendReply("unfollowing",req)
                }
            }else{
                cb(null, true)
                handleFollowUnFollow('follow-user',m[1])
                sendReply("following",req)
            }

        } catch(e) {
            cb()
        }

    })

    const client = new cote.Requester({
        name: 'ssb client',
        key: 'everlife-ssb-svc',
    })
    function handleFollowUnFollow(type, id) {
        client.send({ type: type, userid: id }, (err) => {
            if(err) u.showErr(err)
        })
    }

}

main()
