var chatService = new IMService();

//枚举，代表三个页面
var Pages = {
    //登录页面
    login: 0,
    //联系人
    contacts: 1,
    //私聊界面
    privateChat: 2,
    //群聊界面
    groupChat: 3
};

//标记所处的页面和当前聊天的好友
var currentPage = {
    page: Pages.login,
    currentUser: null,
    currentChatFriend: null,
    currentChatGroup: null
};

//为了避免controller层侵入到service层，用controller层的代码覆盖service层的预置方法
chatService.onNewPrivateMessageReceive = onNewPrivateMessageReceive;
chatService.onPrivateHistoryLoad = onPrivateHistoryLoad;
chatService.onNewGroupMessageReceive = onNewGroupMessageReceive;
chatService.onGroupHistoryLoad = onGroupHistoryLoad;
chatService.onFriendListChange = onFriendListChange;
chatService.onGroupListChange = onGroupListChange;

//登录
function login() {
    var username = $("#username").val();
    var password = $("#password").val();
    var resultStatus = chatService.login(username, password);
    if (resultStatus) {
        //初始化GoEasy和本地好友列表
        chatService.connectIM();
        $("#login-box").hide();
        //切换到联系人
        switchToContacts();
    } else {
        //显示错误信息
        $("#login-error-box").show();
    }
}

//切换到联系人界面
function switchToContacts() {
    //设置当前页面为好友列表页面
    currentPage.page = Pages.contacts;
    //修改页面的title
    $("title").text("联系人");
    $('.login').hide()

    //初始化当前用户
    currentPage.currentUser = chatService.currentUser;
    $("#current-user-avatar").attr("src", currentPage.currentUser.avatar);
    $("#current-user-name").text(currentPage.currentUser.name);

    //隐藏聊天窗口
    $("#chat-box").hide();
    $("#group-chat-box").hide();

    //获取好友数据
    var friendsMap = chatService.friends;
    //绘制好友列表
    drawFriendList(friendsMap);
    //显示好友列表
    $("#friends-box").show();

    //获取群数据
    var groupsMap = chatService.groups;
    //绘制群列表
    drawGroupList(groupsMap);
    //显示群列表
    $("#group-box").show()
}

//绘制好友列表
function drawFriendList(friends) {
    var friendListDiv = $("#friend-list");
    friendListDiv.empty();
    for (var key in friends) {
        var item = $("#friend-item-template").clone();//好友信息的模版
        item.remove('#friend-item-template');
        var friend = friends[key];

        //更新好友uuid
        item.attr("id", friend.uuid);
        //设置好友头像
        var friendAvatarImg = item.find("img");
        friendAvatarImg.attr("src", friend.avatar);
        friendAvatarImg.attr("id", "avatar_" + key);
        //设置好友名称
        item.find(".friend-name").html(friend.name);
        //更新未读消息数
        var unReadMessage = friend.unReadMessage;
        item.find(".message-count").text(unReadMessage);

        //显示或隐藏未读消息数
        var messageBadge = item.find(".friend-item-message-badge");
        if (unReadMessage == 0) {
            //没有未读消息，隐藏消息数量
            messageBadge.hide();
        } else {
            //有未读消息，展现未读消息量
            messageBadge.show();
        }

        //添加点击事件，点击好友条目后，进入聊天窗口
        (function (key) {
            var friend = friends[key]
            item.click(function () {
                switchToPrivateChat(friend);
            });
        })(key)

        //将一条好友添加到好友的列表中
        friendListDiv.append(item);

        if (friend.online) {
            $("#avatar_" + key).removeClass("friend-avatar-desaturate");
        }
    }
}

//绘制群列表
function drawGroupList(groups) {
    var groupListDiv = $("#group-list");
    groupListDiv.empty();
    for (var key in groups) {
        var item = $("#group-item-template").clone();//群信息的模版
        item.remove('#group-item-template');
        var group = groups[key];
        //设置群id
        item.attr("id", key);
        //设置群名称
        item.find(".group-name").html(group.name);
        //更新未读消息数
        var unReadMessage = group.unReadMessage;
        item.find(".message-count").text(unReadMessage);

        //显示或隐藏未读消息数
        var messageBadge = item.find(".friend-item-message-badge");
        if (unReadMessage == 0) {
            //没有未读消息，隐藏消息数量
            messageBadge.hide();
        } else {
            //有未读消息，展现未读消息量
            messageBadge.show();
        }

        //添加点击事件，点击好友条目后，进入聊天窗口
        (function (key) {
            var group = groups[key]
            item.click(function () {
                switchToGroupChat(group);
            });
        })(key)

        //将一条好友添加到好友的列表中
        groupListDiv.append(item);
    }
}

//切换到私聊界面
function switchToPrivateChat(friend) {
    //设置当前页面为聊天页面和聊天的好友
    currentPage.page = Pages.privateChat;
    currentPage.currentChatFriend = friend;
    $("title").text("私聊界面");

    //先清空之前的聊天内容
    var chatBoxContent = $("#chat-box-content");
    chatBoxContent.empty();

    //隐藏好友列表
    $("#friends-box").hide();
    //更新当前聊天的好友名称
    $(".current-friend-name").text(friend.name);

    //显示聊天窗口
    $("#chat-box").show();

    $("#sendMessageButton").off('click').on("click", function () {
        sendPrivateChatMessage(friend.uuid);
    });

    //绘制聊天消息
    var messages = chatService.getPrivateMessages(friend.uuid);
    if (messages.length != 0) {
        drawPrivateChatMessage(messages, true)
    }
}

//切换到群聊界面
function switchToGroupChat(group) {
    //设置当前页面为聊天页面和聊天的好友
    currentPage.page = Pages.groupChat;
    currentPage.currentChatGroup = group;
    $("title").text("群聊界面");

    //先清空之前的聊天内容
    var chatBoxContent = $("#group-chat-box-content");
    chatBoxContent.empty();

    //隐藏好友列表
    $("#friends-box").hide();
    //更新当前聊天的好友名称
    $(".current-friend-name").text(group.name);

    //显示聊天窗口
    $("#group-chat-box").show();

    $("#groupSendMessageButton").off('click').on("click", function () {
        sendGroupChatMessage(group.uuid);
    });

    //绘制界面聊天消息
    var messages = chatService.getGroupMessages(group.uuid)
    drawGroupChatMessage(messages, true)
}

//私聊回到联系人
function privateChatBackToContacts() {
    chatService.resetFriendUnReadMessage(currentPage.currentChatFriend);
    switchToContacts()
}

// 发送私聊消息
function sendPrivateChatMessage() {
    //获取content并赋值
    var messageInputBox = $("#send-input-box");

    var content = messageInputBox.val();
    if (content != '' && content.trim().length > 0) {
        // 发送消息
        chatService.sendPrivateMessage(currentPage.currentChatFriend.uuid, content);
        //发送消息后输入框清空
        messageInputBox.val("");
    }
}

//加载私聊历史消息
function loadPrivateHistory() {
    var messages = chatService.getPrivateMessages(currentPage.currentChatFriend.uuid);
    let earliestMessageTimeStamp = Date.now();
    let earliestMessage = messages[0];
    if (earliestMessage) {
        earliestMessageTimeStamp = earliestMessage.timestamp;
    }
    this.chatService.loadPrivateHistoryMessage(currentPage.currentChatFriend.uuid, earliestMessageTimeStamp)
}

//监听私聊历史消息加载
function onPrivateHistoryLoad(friendId, messages) {
    if (messages.length == 0) {
        $('#top').html('已经没有更多的历史消息');
        $('#top').css({color: 'gray', textDecoration: 'none'});
        return
    }
    var chatMessages = chatService.getPrivateMessages(friendId)
    drawPrivateChatMessage(chatMessages)
}

//绘制界面私聊消息
function drawPrivateChatMessage(privateMessages, scrollToBottom) {
    var chatBoxContent = $("#chat-box-content");
    chatBoxContent.empty();
    privateMessages.forEach(function (message) {
        var messageTemplate;
        //判断这条消息是谁发的
        if (message.senderId === chatService.currentUser.uuid) {
            //自己发送的消息展示在右边
            messageTemplate = $("#chat-box-self-message-template").clone();
            messageTemplate.remove('#chat-box-self-message-template');
            //更新头像
            messageTemplate.find("img").attr("src", chatService.currentUser.avatar);
        } else {
            //如果该为好友发送的消息展示在左边
            messageTemplate = $("#chat-box-friend-message-template").clone();
            messageTemplate.find("img").attr("src", currentPage.currentChatFriend.avatar);
        }
        messageTemplate.find(".chat-message").text(message.payload);
        //显示一条消息到页面上
        chatBoxContent.append(messageTemplate);
    });

    //将滚动条拉到最下
    scrollToBottom && $('#private-box').scrollTop($('#private-box')[0].scrollHeight);
}

//群聊回到联系人
function groupChatBackToContacts() {
    chatService.resetGroupUnReadMessage(currentPage.currentChatGroup);
    switchToContacts()
}

//发送群聊消息
function sendGroupChatMessage() {
    //获取content并赋值
    var messageInputBox = $("#group-send-input-box");

    var content = messageInputBox.val();
    if (content != '' && content.trim().length > 0) {
        // 发送消息
        chatService.sendGroupMessage(currentPage.currentChatGroup.uuid, content);
        //发送消息后输入框清空
        messageInputBox.val("");
    }
}

//加载群聊历史消息
function loadGroupHistory() {
    var messages = chatService.getGroupMessages(currentPage.currentChatGroup.uuid);
    let earliestMessageTimeStamp = Date.now();
    let earliestMessage = messages[0];
    if (earliestMessage) {
        earliestMessageTimeStamp = earliestMessage.timestamp;
    }
    this.chatService.loadGroupHistoryMessage(currentPage.currentChatGroup.uuid, earliestMessageTimeStamp)
}

//监听群聊历史消息加载
function onGroupHistoryLoad(groupId, messages) {
    if (messages.length == 0) {
        $('#group-top').html('已经没有更多的历史消息');
        $('#group-top').css({color: 'gray', textDecoration: 'none'});
        return
    }
    ;
    var chatMessage = chatService.getGroupMessages(groupId)
    drawGroupChatMessage(chatMessage)
}

//绘制群聊界面消息
function drawGroupChatMessage(groupMessages, scrollToBottom) {
    var currentUser = chatService.currentUser;
    var chatBoxContent = $("#group-chat-box-content");
    chatBoxContent.empty();
    groupMessages.forEach(function (message) {
        var messageTemplate;
        //判断这条消息是谁发的
        if (message.senderId === currentUser.uuid) {
            //自己发送的消息展示在右边
            messageTemplate = $("#chat-box-self-message-template").clone();
            messageTemplate.remove('#chat-box-self-message-template');
            //更新头像
            messageTemplate.find("img").attr("src", currentUser.avatar);
        } else {
            //如果该为好友发送的消息展示在左边
            messageTemplate = $("#chat-box-friend-message-template").clone();
            messageTemplate.remove('#chat-box-self-message-template');

            var friend = chatService.friends[message.senderId]
            messageTemplate.find("img").attr("src", friend.avatar);
        }
        messageTemplate.find(".chat-message").text(message.payload);
        //显示一条消息到页面上
        chatBoxContent.append(messageTemplate);
    });

    //将滚动条拉到最下
    scrollToBottom && $('#group-box').scrollTop($('#group-box')[0].scrollHeight);
}

//监听接收私聊消息
function onNewPrivateMessageReceive(friendId, chatMessage) {
    let friend = chatService.friends[friendId];
    //如果当前窗口是在好友列表页面，只显示未读消息数
    if (currentPage.page == Pages.contacts) {
        drawFriendList(chatService.friends)
    } else {
        drawPrivateChatMessage(chatService.getPrivateMessages(friendId), true)
    }
}

//监听接收群聊消息
function onNewGroupMessageReceive(groupId, chatMessage) {
    let group = chatService.groups[groupId];

    //如果当前窗口是在好友列表页面，只显示未读消息数
    if (currentPage.page == Pages.contacts) {
        var groupItem = $("#" + groupId);
        groupItem.find(".message-count").text(group.unReadMessage);
        groupItem.find(".friend-item-message-badge").show();
    } else {
        drawGroupChatMessage(chatService.getGroupMessages(groupId), true)
    }
}

//更新好友列表
function onFriendListChange(friends) {
    drawFriendList(friends)
}

//更新群列表
function onGroupListChange(groups) {
    drawGroupList(groups)
}

//显示群成员
function showGroupMember() {
    $('#group-member-layer').show();
    var members = chatService.getGroupMembers(currentPage.currentChatGroup.uuid);
    $('.group-member-amount').html("成员(" + Object.keys(members).length + ')')
    let str = "";
    for (var key in members) {
        str += '<img src="' + members[key].avatar + '"/>'
    }
    $('.layer-container').html(str)
}

//隐藏群成员
function hideGroupMember() {
    $('#group-member-layer').hide();
}

