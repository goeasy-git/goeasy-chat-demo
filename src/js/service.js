function Friend(uuid, username, avatar){
    this.uuid = uuid;
    this.username = username;
    this.avatar = avatar;
    this.online = false;
    this.unReadMessage = 0;
}
function CurrentUser(uuid,username,avatar){
    this.uuid = uuid;
    this.username = username;
    this.avatar = avatar;
}


function ChatMessage(senderUUID, content) {
    this.senderUUID = senderUUID;
    this.content = content;
}

function Service() {

    this.currentUser = null;

    this.friendList = [];

    this.restapi = new RestApi();

    this.goeasy;


    var self = this;

    //为了避免controller层侵入到service层，三个空方法供用controller层的代码覆盖
    this.onNewChatMessage = function () {
        // 好友发送消息
    };
    this.onFriendOnline = function () {
        // 好友上线
    };
    this.onFriendOffline = function () {
        // 好友下线
    };


    this.login = function (username, password) {
        var user = this.restapi.loadUser(username, password);
        var result = {};
        if (user == null) {
            result.success = false;
        } else {
            this.currentUser = new CurrentUser(user.uuid, username, user.avatar);
            result.success = true;
        }
        return result;
    };
    //自己订阅
    this.initialGoEasyAndFriends = function () {
        goeasy = new GoEasy({
            appkey: "您的AppKey",
            host: "hangzhou.goeasy.io",
            userId: this.currentUser.uuid,
            userData: '{"username":"' + this.currentUser.username + '","avatar":"' + this.currentUser.avatar + '"}'
        });
        this.initialFriendList();
        this.subscriberFriendPrencenseAndNewMessage();
    }

    this.initialFriendList = function () {
        var friends = this.restapi.findFriends(this.currentUser.uuid);
        friends.forEach(function (friendFromBackend) {
            var uuid = friendFromBackend.friendUUID;
            var username = friendFromBackend.username;
            var avatar = friendFromBackend.avatar;
            var friend = new Friend(uuid, username, avatar);
            self.friendList.push(friend);
        });
    };
    // 所有的朋友订阅上下线,并且根据sessionId订阅，uuid作为channel
    this.subscriberFriendPrencenseAndNewMessage = function () {
        this.friendList.forEach(function (friend) {
            goeasy.subscribePresence({
                channel: friend.uuid,
                onPresence: function (presenceEvents) {
                    presenceEvents.events.forEach(function (event) {
                        var friendUUid = event.userId;

                        var localFriend = self.findLocalFriendByUUID(friendUUid);

                        if (event.action == "join" || event.action == "online") {
                            localFriend.online = true;
                            onFriendOnline(friendUUid);
                        } else {
                            localFriend.online = false;
                            onFriendOffline(friendUUid);
                        }
                    });
                }
            });
        });

        // 接收消息
        goeasy.subscribe({
            channel: this.currentUser.uuid, //替换为您自己的channel
            onMessage: function (message) {
                var chatMessage = JSON.parse(message.content);
                var friendUUID = chatMessage.senderUUID;
                //todo:事实上不推荐在前端收到时保存, 一个用户开多个窗口，会导致重复保存, 建议所有消息都是都在发送时在服务器端保存，这里只是为了演示
                self.restapi.saveChatMessage(self.currentUser.uuid,friendUUID, chatMessage);
                var friend = self.findLocalFriendByUUID(chatMessage.senderUUID);
                friend.unReadMessage = friend.unReadMessage + 1;
                self.onNewChatMessage(chatMessage, friend);
            }
        });
    };

    this.clearUnreadMessage = function (friendUUid) {
        var friend = self.findLocalFriendByUUID(friendUUid);
        friend.unReadMessage = 0;
    };

    //获取好友
    this.findLocalFriendByUUID = function (uuid) {
        for (var i = 0; i < this.friendList.length; i++) {
            var friend = this.friendList[i];
            if (friend.uuid == uuid) {
                return friend;
            }
        }
        return null;
    };

    //获取在线的好友
    this.initialFriendOnlineStatus = function () {
        var friendUuids = [];
        this.friendList.forEach(function (friend, index) {
            var uuid = friend.uuid;
            friendUuids.push(uuid);
        });
        goeasy.hereNowByUserIds({
            userIds: friendUuids
        }, function (result) {
            if (result.code == 200) {
                result.content.forEach(function (user) {
                    var friendUUID = user.userId;
                    var friend = self.findLocalFriendByUUID(friendUUID);
                    friend.online = true;
                    onFriendOnline(friend.uuid);//不得已而为之的代码
                });
            }
        });
    };
    //登录成功后会加载好友列表
    this.getFriendList = function () {
        return this.friendList;
    };

    //加载历史记录
    this.loadChatHistory = function (friendUUID) {
        //打开聊天框就对未读消息清零
        this.clearUnreadMessage(friendUUID);
        var chatMessages = this.restapi.findChatHistory(this.currentUser.uuid, friendUUID);
        return chatMessages;
    };
    //发送消息
    this.sendChat = function (friendUUID, content) {
        var friend = this.findLocalFriendByUUID(friendUUID);
        var chatMessage = new ChatMessage(this.currentUser.uuid, content);
        this.restapi.publishChatMessage(this.currentUser.uuid, friendUUID, chatMessage);

        this.onNewChatMessage(chatMessage, friend);
    };
}
