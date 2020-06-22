/*
 * @Author: jack.lu
 * @Date: 2020-4-21 10:10:20
 * @Last Modified by: jack.lu
 * @Last Modified time: 2020-4-21 15:01:41
 */

function Friend(uuid, name, avatar) {
    this.uuid = uuid;
    this.name = name;
    this.avatar = avatar;
    this.online = false;
    this.unReadMessage = 0;
}

function Group(uuid, name, avatar) {
    this.uuid = uuid;
    this.name = name;
    this.avatar = avatar;
    this.unReadMessage = 0;
}

function CurrentUser(uuid, name, avatar) {
    this.uuid = uuid;
    this.name = name;
    this.avatar = avatar;
}

function IMService() {
    this.im = GoEasyIM.getInstance({
        appkey: '您的appkey',
        host: 'hangzhou.goeasy.io',
    });
    //当前“我”
    this.currentUser = null;
    //我的好友
    this.friends = {};
    //我的群
    this.groups = {};
    //私聊消息记录，map格式，每个好友对应一个数组
    this.privateMessages = {};
    //群聊消息记录，map格式，每个群对应一个数组
    this.groupMessages = {};
    /*
     * 监听器们
     *
     * 可以在页面里，根据需求，重写以下监听器，
     * 便于当各种事件触发时，页面能够执行对应的响应
     *
     */
    //收到一条私聊消息
    this.onNewPrivateMessageReceive = function (friendId, message) {
    };
    //完成一次私聊历史加载
    this.onPrivateHistoryLoad = function (friendId, messages) {
    };
    //收到一条群聊消息
    this.onNewGroupMessageReceive = function (groupId, message) {
    };
    //完成一次群聊历史加载
    this.onGroupHistoryLoad = function (groupId, messages) {
    };
    //好友列表发生改变
    this.onFriendListChange = function (friends) {
    };
    //群列表发生改变
    this.onGroupListChange = function (groups) {
    };
}

//登录
IMService.prototype.login = function (username, password) {
    var user = restApi.findUser(username, password);
    if (user) {
        //初始化当前用户
        this.currentUser = new CurrentUser(user.uuid, user.name, user.avatar);
        //初始化联系人信息，包括群
        this.initialContacts();
        return true;
    } else {
        return false;
    }
};

//初始化联系人信息
IMService.prototype.initialContacts = function () {
    //查询并初始化好友信息
    let friendList = restApi.findFriends(this.currentUser);

    //将用户列表初始化为一个map，便于后续根据friendId得到friend
    friendList.map(friend => {
        this.friends[friend.uuid] = new Friend(friend.uuid, friend.name, friend.avatar);
    });

    //查询并初始化与自己相关的群信息
    let groupList = restApi.findGroups(this.currentUser);

    //将群列表初始化为一个map，方便后续根据groupId索引
    groupList.map(group => {
        this.groups[group.uuid] = new Group(group.uuid, group.name, group.avatar);
    });
};

//获取群成员
IMService.prototype.getGroupMembers = function (groupId) {
    let members = restApi.findGroupMembers(groupId);
    let membersMap = {};
    members.map(item => {
        membersMap[item.uuid] = item
    });
    return membersMap;
};

IMService.prototype.getGroupMessages = function (groupId) {
    if (!this.groupMessages[groupId]) {
        this.groupMessages[groupId] = [];
    }
    return this.groupMessages[groupId]
};

IMService.prototype.getPrivateMessages = function (friendId) {
    if (!this.privateMessages[friendId]) {
        this.privateMessages[friendId] = [];
    }
    return this.privateMessages[friendId]
};

//重置群聊未读消息
IMService.prototype.resetGroupUnReadMessage = function (group) {
    this.groups[group.uuid].unReadMessage = 0;
    this.onGroupListChange(this.groups);
};

//将好友的未读消息数字清零
IMService.prototype.resetFriendUnReadMessage = function (friend) {
    this.friends[friend.uuid].unReadMessage = 0;
    this.onFriendListChange(this.friends);
};

//连接GoEasy
IMService.prototype.connectIM = function () {
    //初始化IM相关的监听器
    this.initialIMListeners();
    this.im.connect({
        id: this.currentUser.uuid,
        data: {
            avatar: this.currentUser.avatr,
            name: this.currentUser.name
        }
    }).then(() => {
        console.log('连接成功')
        //订阅与自己相关的群信息
        this.subscribeGroupMessage();
        //初始化好友们的在线状态
        this.initialFriendOnlineStatus();
        //订阅我的好友们的上下线信息
        this.subscribeFriendsPresence();
    }).catch(error => {
        console.log('连接失败,请确保网络正常，appkey和host正确，code:' + error.code + " content:" + error.content);
    });
};

//IM监听
IMService.prototype.initialIMListeners = function () {
    this.im.on(GoEasyIM.EVENT.CONNECTED, () => {
        console.log('连接成功.')
    });

    this.im.on(GoEasyIM.EVENT.DISCONNECTED, () => {
        console.log('连接断开.')
    });

    //监听好友上下线
    this.im.on(GoEasyIM.EVENT.USER_PRESENCE, (user) => {
        //更新好友在线状态
        let onlineStatus = user.action == 'online' ? true : false;
        let friend = this.friends[user.userId];
        friend.online = onlineStatus;

        //如果页面传入了相应的listener，执行listener
        this.onFriendListChange(this.friends);
    });

    //监听私聊消息
    this.im.on(GoEasyIM.EVENT.PRIVATE_MESSAGE_RECEIVED, (message) => {
        //如果不是自己发的，朋友未读消息数 +1
        if (message.senderId != this.currentUser.uuid) {
            let friend = this.friends[message.senderId];
            friend.unReadMessage++;
            this.onFriendListChange(this.friends);
        }

        //更新私聊消息记录
        let friendId;
        if (this.currentUser.uuid == message.senderId) {
            friendId = message.receiverId;
        } else {
            friendId = message.senderId;
        }

        let friendMessages = this.getPrivateMessages(friendId);
        friendMessages.push(message);

        //如果页面传入了相应的listener，执行listener
        this.onNewPrivateMessageReceive(friendId, message);
    });

    //监听群聊消息
    this.im.on(GoEasyIM.EVENT.GROUP_MESSAGE_RECEIVED, (message) => {
        //群未读消息+1
        let groupId = message.groupId;
        let group = this.groups[groupId];
        group.unReadMessage++;

        //如果页面传入了相应的listener，执行listener
        this.onGroupListChange(this.groups);

        //更新群聊消息记录
        let groupMessages = this.getGroupMessages(groupId);
        groupMessages.push(message);

        //如果页面传入了相应的listener，执行listener
        this.onNewGroupMessageReceive(groupId, message);
    })
};

//订阅群消息
IMService.prototype.subscribeGroupMessage = function () {
    let groupIds = Object.keys(this.groups);
    this.im.subscribeGroup(groupIds)
        .then(() => {
            console.log('订阅群消息成功')
        })
        .catch(error => {
            console.log('订阅群消息失败')
            console.log(error)
        })
};

//初始化好友在线状态
IMService.prototype.initialFriendOnlineStatus = function () {
    let friendIds = Object.keys(this.friends);
    this.im.hereNow({
        userIds: friendIds
    }).then(result => {
        let onlineFriends = result.content;
        onlineFriends.map(user => {
            let friend = this.friends[user.userId];
            friend.online = true;
        });
        this.onFriendListChange(this.friends);
    }).catch(error => {
        console.log(error)
        if (error.code == 401) {
            console.log("获取在线用户失败，您尚未开通用户在线状态，请登录GoEasy，查看应用详情里自助启用.");
        }
    })
};

//监听所有好友上下线
IMService.prototype.subscribeFriendsPresence = function () {
    let friendIds = Object.keys(this.friends);
    this.im.subscribeUserPresence(friendIds)
        .then(() => {
            console.log('监听好友上下线成功')
        })
        .catch(error => {
            console.log(error);
            if (error.code == 401) {
                console.log("监听好友上下线失败，您尚未开通用户状态提醒，请登录GoEasy，查看应用详情里自助启用.");
            }
        });
};

//加载单聊历史消息
IMService.prototype.loadPrivateHistoryMessage = function (friendId, timeStamp) {
    this.im.history({
        friendId: friendId,
        lastTimestamp: timeStamp
    }).then(result => {
        let history = result.content;
        let friendMessages = this.getPrivateMessages(friendId);
        for (let i = history.length - 1; i >= 0; i--) {
            friendMessages.unshift(history[i])
        }
        //如果页面传入了相应的listener，执行listener
        this.onPrivateHistoryLoad(friendId, history);
    }).catch(error => {
        console.log(error);
        if (error.code == 401) {
            console.log("您尚未开通历史消息，请登录GoEasy，查看应用详情里自助启用.");
        }
    })
};

//发送私聊消息
IMService.prototype.sendPrivateMessage = function (friendId, message) {
    let chatMessage = this.im.createMessage(message);
    this.im.sendPrivateMessage(friendId, chatMessage)
        .then(() => {
            console.log('发送私聊成功')
        }).catch(error => {
        console.log(error)
    })
};

//发送群聊消息
IMService.prototype.sendGroupMessage = function (groupId, message) {
    let chatMessage = this.im.createMessage(message);
    this.im.sendGroupMessage(groupId, chatMessage)
        .then(() => {
            console.log('发送群聊成功')
        }).catch(error => {
        console.log(error)
    })
};

//群聊历史消息
IMService.prototype.loadGroupHistoryMessage = function (groupId, timeStamp) {
    this.im.history({
        groupId: groupId,
        lastTimestamp: timeStamp
    }).then(result => {
        let history = result.content;
        let groupMessages = this.getGroupMessages(groupId);
        for (let i = history.length - 1; i >= 0; i--) {
            groupMessages.unshift(history[i]);
        }
        this.onGroupHistoryLoad(groupId, history);
    }).catch(error => {
        console.log(error)
        if (error.code == 401) {
            console.log("您尚未开通历史消息，请登录GoEasy，查看应用详情里自助启用.");
        }
    })
};