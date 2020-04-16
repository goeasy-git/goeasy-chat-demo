var chatService = new Service();

//枚举，代表三个页面
var Pages = {
    //登录页面
    login: 0,
    //好友列表
    friendList: 1,
    //聊天页面
    chatForm: 2
};


//标记所处的页面和当前聊天的好友
var currentPage = {
    page: Pages.login,
    currentChatFriendUUID: ''
};


function login() {
    var username = $("#username").val();
    var password = $("#password").val();
    var result = chatService.login(username, password);
    if (result.success) {

        //为了避免controller层侵入到service层，用controller层的代码覆盖service层的预置方法
        chatService.onNewChatMessage = onNewChatMessage;
        chatService.onFriendOnline = onFriendOnline;
        chatService.onFriendOffline = onFriendOffline;
        chatService.onShowToast = showToast;

        //初始化GoEasy和本地好友列表
        chatService.initialGoEasyAndFriends();
        $("#login-box").hide();
        switchToUserList();
        //初始化好友在线状态
        chatService.initialFriendOnlineStatus();
        //修改title
        $("title").text("好友列表");
    } else {
        //显示错误信息
        $("#login-error-box").show();
    }
}


function onFriendOnline(uuid) {
    // 朋友上线头像变彩色
    $("#avatar_" + uuid).removeClass("friend-avatar-desaturate");
    //如果是當前聊天的消息
    //忽略
    //如果在用戶列表
    // 刷新用戶列表
}

function onFriendOffline(uuid) {
    //好友下线头像变灰色
    $("#avatar_" + uuid).addClass("friend-avatar-desaturate");
    //如果是當前聊天的消息
    // 忽略
    //如果在用戶列表，紅色數字
    // 刷新用戶列表
}


function switchToUserList() {
    //修改页面的title
    $("title").text("好友列表");

    //设置当前页面为好友列表页面
    currentPage.page = Pages.friendList;

    //清空之前的好友列表信息
    var friendListDiv = $("#friend-list");
    friendListDiv.empty();

    //初始胡当前用户的头像和昵称
    var currentUser = chatService.currentUser;
    $("#current-user-avatar").attr("src", currentUser.avatar);
    $("#current-user-name").text(currentUser.username);

    //隐藏聊天窗口
    $("#chat-box").hide();

    //显示好友列表
    $("#friends-box").show();

    //获取用户的本地好友列表
    var friendList = chatService.getFriendList();

    //展示好友到界面上
    friendList.forEach(function (friend) {
        var item = $("#friend-item-template").clone();//好友信息的模版

        //更新好友uuid
        item.attr("id", friend.uuid);

        //设置好友头像
        var friendAvatarImg = item.find("img");
        friendAvatarImg.attr("src", friend.avatar);
        friendAvatarImg.attr("id", "avatar_" + friend.uuid);

        //设置好友名称
        item.find(".friend-name").html(friend.username);

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
        item.click(function () {
            showChatForm(friend.uuid, friend.username, friend.avatar);
        });

        //将一条好友添加到好友的列表中
        friendListDiv.append(item);


        if (friend.online) {
            onFriendOnline(friend.uuid);
        }
    });


}

//接收到新的聊天消息
function onNewChatMessage(chatMessage, friend) {

    //如果当前窗口是在好友列表页面，只显示未读消息数


    if (currentPage.page == Pages.friendList) {
        var friendItem = $("#" + friend.uuid);
        friendItem.find(".message-count").text(friend.unReadMessage);
        friendItem.find(".friend-item-message-badge").show();
    } else {
        var messageTemplate;
        //如果当前窗口不是与收到消息的朋友的聊天窗口，直接显示
        if (currentPage.currentChatFriendUUID == friend.uuid) {

            var currentUser = chatService.currentUser;

            //如果消息是自己发送的，显示在右边
            if (chatMessage.senderUUID == currentUser.uuid) {
                messageTemplate = $("#chat-box-self-message-template").clone();
                messageTemplate.find("img").attr("src", currentUser.avatar);
            } else {
                //如果是好友发送的，显示在左边
                messageTemplate = $("#chat-box-friend-message-template").clone();
                messageTemplate.find("img").attr("src", friend.avatar);
                chatService.clearUnreadMessage(friend.uuid);
            }
            //设置消息内容
            messageTemplate.find(".chat-message").text("" + chatMessage.content);

            //显示消息到页面
            var chatBoxContent = $("#chat-box-content");
            chatBoxContent.append(messageTemplate);
        }

        //将滚动条拉到最下
        $('#chat-box-content').scrollTop($('#chat-box-content')[0].scrollHeight);
    }
}

function showChatForm(friendUUID, friendUsername, friendAvatar) {
    //设置当前页面为聊天页面和聊天的好友
    currentPage.page = Pages.chatForm;
    currentPage.currentChatFriendUUID = friendUUID;

    $("title").text("聊天界面");

    //先清空之前的聊天内容
    var chatBoxContent = $("#chat-box-content");
    chatBoxContent.empty();

    //隐藏好友列表
    $("#friends-box").hide();

    //更新当前聊天的好友名称
    $(".current-friend-name").text(friendUsername);

    //显示聊天窗口
    $("#chat-box").show();

    $("#sendMessageButton").off('click').on("click", function () {
        sendChatMessage(friendUUID);
    });

    //获取聊天记录
    var chatHistory = chatService.loadChatHistory(friendUUID);
    var currentUser = chatService.currentUser;

    chatHistory.forEach(function (chatMessage) {
        var messageTemplate;
        //判断这条消息是谁发的
        if (chatMessage.senderUUID == currentUser.uuid) {
            //自己发送的消息展示在右边
            messageTemplate = $("#chat-box-self-message-template").clone();
            //更新头像
            messageTemplate.find("img").attr("src", currentUser.avatar);
        } else {
            //如果该为好友发送的消息展示在左边
            messageTemplate = $("#chat-box-friend-message-template").clone();
            messageTemplate.find("img").attr("src", friendAvatar);
            chatService.clearUnreadMessage(friendUUID);
        }
        messageTemplate.find(".chat-message").text(chatMessage.content);
        //显示一条消息到页面上
        chatBoxContent.append(messageTemplate);
    });

    //将滚动条拉到最下
	$('#chat-box-content').scrollTop($('#chat-box-content')[0].scrollHeight);
}

// 发送消息
function sendChatMessage(friendUUID) {
    //获取content并赋值
    var messageInputBox = $("#send-input-box");

    var content = messageInputBox.val();
    if (content != '' && content.trim().length > 0) {
        // 发送消息
        chatService.sendChat(friendUUID, content);
        //发送消息后输入框清空
        messageInputBox.val("");
    }
}

//全局计时器
var timer = null;

//显示提示框
function showToast(message) {
    return function () {
        if (timer) {
            return;
        }
        $('.toast').show().append(message);
        timer = setTimeout(function () {
            hideToast();
            timer = null;
        }, 6000)
    }()
}

//隐藏提示框
function hideToast() {
    $('.toast').hide().empty();
}
