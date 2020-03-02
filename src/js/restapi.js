var users = [{
		"uuid": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"username": "Mattie",
		"password": "123",
		"avatar": "img/Avatar-1.png"
	},
	{
		"uuid": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"username": "Wallace",
		"password": "123",
		"avatar": "img/Avatar-2.png"
	},
	{
		"uuid": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"username": "Tracy",
		"password": "123",
		"avatar": "img/Avatar-3.png"
	},
	{
		"uuid": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"username": "Juanita",
		"password": "123",
		"avatar": "img/Avatar-4.png"
	}
];

var friends = [{
		"userUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"friendUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"sessionID": "012247ce-dca7-4f4f-84f9-de4cfd614380"
	},
	{
		"userUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"friendUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"sessionID": "bdbdbe44-5fd3-4b20-98a3-93413242180c"
	},
	{
		"userUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"friendUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"sessionID": "608416da-263d-4701-b5b5-e9e613802e74"
	},

	{
		"userUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"friendUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"sessionID": "012247ce-dca7-4f4f-84f9-de4cfd614380"
	},
	{
		"userUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"friendUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"sessionID": "662e5fd3-f3d3-4d76-8a6b-0a5da5bcf50a"
	},
	{
		"userUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"friendUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"sessionID": "db5e39a6-70c4-4650-b595-fb007fb3033d"
	},

	{
		"userUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"friendUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"sessionID": "bdbdbe44-5fd3-4b20-98a3-93413242180c"
	},
	{
		"userUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"friendUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"sessionID": "662e5fd3-f3d3-4d76-8a6b-0a5da5bcf50a"
	},
	{
		"userUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"friendUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"sessionID": "dc91cb25-80c9-4db6-84f2-7c15969763c8"
	},

	{
		"userUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"friendUUID": "08c0a6ec-a42b-47b2-bb1e-15e0f5f9a19a",
		"sessionID": "608416da-263d-4701-b5b5-e9e613802e74"
	},
	{
		"userUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"friendUUID": "3bb179af-bcc5-4fe0-9dac-c05688484649",
		"sessionID": "db5e39a6-70c4-4650-b595-fb007fb3033d"
	},
	{
		"userUUID": "33c3693b-dbb0-4bc9-99c6-fa77b9eb763f",
		"friendUUID": "fdee46b0-4b01-4590-bdba-6586d7617f95",
		"sessionID": "dc91cb25-80c9-4db6-84f2-7c15969763c8"
	}
];


var RestApi = function() {
	this.loadUser = function(username, password) {
		for (var i = 0; i < users.length; i++) {
			if (username == users[i].username && password == users[i].password) {
				return users[i];
			}
		}
		return null;
	};

	this.findFriends = function(userUUID) {
		var friendsList = [];
		friends.forEach(function(friend) {
			if (friend.userUUID == userUUID) {
				users.forEach(function(user) {
					if (user.uuid == friend.friendUUID) {
						friend.username = user.username;
						friend.avatar = user.avatar;
					}
				})
				friendsList.push(friend);
			}
		});
		return friendsList;
	};


	this.findChatHistory = function(currentUserUUID, friendUUID) {
		var localStorageKey = currentUserUUID + "." + friendUUID;
		var friendChatHistoryAsString = localStorage.getItem(localStorageKey);
		if (friendChatHistoryAsString != null) {
			var friendChatHistory = JSON.parse(friendChatHistoryAsString);
			return friendChatHistory;
		}
		return [];
	};

	this.publishChatMessage = function (currentUserUUID,friendUUID,chatMessage) {
		this.saveChatMessage(currentUserUUID,friendUUID,chatMessage);
		var chatMessageAsJsonString = JSON.stringify(chatMessage);
		goeasy.publish({
			channel: friendUUID,
			message: chatMessageAsJsonString
		});
	};


	this.saveChatMessage = function(currentUserUUID,friendUUID, chatMessage) {
		var localStorageKey = currentUserUUID + "." + friendUUID;
		var friendChatHistoryAsString = localStorage.getItem(localStorageKey);
		var friendChatHistory;
		if (friendChatHistoryAsString == null || friendChatHistoryAsString == "") {
			friendChatHistory = [];
		} else {
			friendChatHistory = JSON.parse(friendChatHistoryAsString);
		}
		friendChatHistory.push(chatMessage);
		friendChatHistoryAsString = JSON.stringify(friendChatHistory);
		localStorage.setItem(localStorageKey, friendChatHistoryAsString);
	};
}
