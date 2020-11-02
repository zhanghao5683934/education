var JsInterface={
	chatFromSocket: function(data) {
		var data =JSON.parse(data) ;//WlTools.strTojson(data);
		var msgObject = data.msg[0];
		var msgaction = msgObject.action;
		var msgmethod = msgObject._method_;
		if(msgmethod=='SendMsg'){ //聊天信息
			this.sendMsg(msgObject);
		}else if(msgmethod=='SystemNot'){ //系统信息
			this.systemNot(msgObject);
		}else if(msgmethod=='Kick'){ //踢人
			this.Kick(msgObject);
		}else if(msgmethod=='Shutup'){ //禁言等操作
			this.Shutup(msgObject);
		}else if(msgmethod=='LinkMic'){ //连麦
			this.LinkMic(msgObject);
		}else if(msgmethod=='ShareScreen'){ //老师共享屏幕
			this.ShareScreen(msgObject);
		}else if(msgmethod=='roomShutup'){ //禁言
			this.roomShutup(msgObject);
		}else if(msgmethod=='exam'){ //测试
			this.exam(msgObject);
		}else if(msgmethod=='practice'){ //练习
			this.practice(msgObject);
		}else if(msgmethod=='rob'){ //抢
			this.rob(msgObject);
		}else if(msgmethod=='know'){ //懂
			this.know(msgObject);
		}else if(msgmethod=='ask'){ //提问
			this.ask(msgObject);
		}
	},
	ShareScreen:function(data){
		console.log(data);
		var action=data.action;

		if(action==0){ //老师开始共享屏幕
			
		}

		if(action==1){ //老师结束共享屏幕
        
		}	
	},
	LinkMic:function(data)
	{
        var msgtype = data.msgtype;
		var msgaction = data.action;
		var _method_ = data._method_;
        
        if(msgaction==1){
            /* 学生举手 */
            Student.addHand();
        }
	},
	Kick:function(data)
	{
		if(data.touid==_DATA.userinfo.id){
			
		}
		
	},
	Shutup:function(data){
		if(data.touid==_DATA.userinfo.id){
			
		}
	},
	getBrowser:function() {
		var ua = window.navigator.userAgent;
		var isIE = window.ActiveXObject != undefined && ua.indexOf("MSIE") != -1;
		var isFirefox = ua.indexOf("Firefox") != -1;
		var isOpera = window.opr != undefined;
		var isChrome = ua.indexOf("Chrome") && window.chrome;
		var isSafari = (ua.indexOf("Safari") != -1 && ua.indexOf("Version") != -1) || ua.indexOf('iPhone') != -1;
		if (isIE) {
			return "IE";
		} else if (isFirefox) {
			return "Firefox";
		} else if (isOpera) {
			return "Opera";
		} else if (isChrome) {
			return "Chrome";
		} else if (isSafari) {
			return "Safari";
		} else {
			return "Unkown";
		}
	},
	sendMsg:function(data){
        var msgtype = data.msgtype;
		var msgaction = data.action;
		var _method_ = data._method_;
        if(msgaction==0){
			this.enterRoom(data);
		}else if(msgaction==1){
            this.sendChat(data);
		}
	},
	sendChat:function(data){
        var html='';
        var teach='';
        var msg_content=data.content;
        msg_content=emojiToImg(msg_content);
        if(data.uid==_DATA.userinfo.id){ //是自己发的
            if(data.user_type==1){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher">讲师</div>';
            }
            if(data.user_type==2){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher">辅导</div>';
            }
            html+='<div class="body_right_speak_li">\
                        <div class="body_right_speak_li_message">\
                            <img class="body_right_speak_li_message_img" src="'+data.avatar+'">\
                            <div class="body_right_speak_li_message_name">'+data.user_nickname+'</div>'+teach+'</div>\
                        <div class="body_right_speak_li_msg">\
                            <div class="body_right_speak_li_msg_san"></div>\
                            <div class="body_right_speak_li_msg_div_text">\
                                <div class="body_right_speak_li_msg_text">'+msg_content+'</div>\
                            </div>\
                        </div>\
                    </div>';
        }else{
            if(data.user_type==1){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher_other">讲师</div>';
            }
            
            if(data.user_type==2){ //是老师发的
                teach+='<div class="body_right_speak_li_message_teacher_other">辅导</div>';
            }
            html+='<div class="body_right_speak_li">\
                        <div class="body_right_speak_li_message">\
                            <img class="body_right_speak_li_message_img_other" src="'+data.avatar+'">\
                            <div class="body_right_speak_li_message_name_other">'+data.user_nickname+'</div>'+teach+'</div>\
                        </div>\
                        <div class="body_right_speak_li_msg">\
                            <div class="body_right_speak_li_msg_san_other"></div>\
                            <div class="body_right_speak_li_msg_div_text_other">\
                                <div class="body_right_speak_li_msg_text_other">'+msg_content+'</div>\
                            </div>\
                        </div>\
                    </div>';
        }
        $('.body_right_speak').append(html);

        var scrollHeight = $('.body_right_speak').prop("scrollHeight");
        $('.body_right_speak').scrollTop(scrollHeight,200);
    },
	enterRoom:function(data){

		var html='<p class="enter">欢迎<span>'+data.ct.user_nickname+'</span>进入直播间</p>';
		$('.body_right_speak').append(html);

		var scrollHeight = $('.body_right_speak').prop("scrollHeight");
		$('.body_right_speak').scrollTop(scrollHeight,200);
	},
	disconnect:function(data){
		var oldnum=$('.livenums').html();
		
		var newnum=parseInt(oldnum)-1;
		$('.livenums').html(newnum);
	},
	systemNot:function(data){

		// //判断是否是手机
		// var mobile_flag = this.isMobile();
		// if(mobile_flag){
				
		// }else{
			var html='';
			if(data.action==1){ //聊天服务器连接提示
				html+='<div class="body_right_speak_msg_tips">'+data.ct+'</div>';
			}
	
			if(data.action==0){ //学生进入房间提示
				html+='<div class="body_right_speak_msg_tips">'+data.ct.user_nicename+'进入房间</div>';
			}
	
			$('.body_right_speak').append(html);

			var scrollHeight = $('.body_right_speak').prop("scrollHeight");
			$('.body_right_speak').scrollTop(scrollHeight,200);
		//}
	},
	isMobile:function() {
		var userAgentInfo = navigator.userAgent;

		var mobileAgents = [ "Android", "iPhone", "SymbianOS", "Windows Phone", "iPad","iPod"];

		var mobile_flag = false;

		//根据userAgent判断是否是手机
		for (var v = 0; v < mobileAgents.length; v++) {
			if (userAgentInfo.indexOf(mobileAgents[v]) > 0) {
				mobile_flag = true;
				break;
			}
		}
		var screen_width = window.screen.width;
		var screen_height = window.screen.height;   

		//根据屏幕分辨率判断是否是手机
		if(screen_width < 500 && screen_height < 800){
			mobile_flag = true;
		}

		return mobile_flag;
	},
    roomShutup:function(data){
		var action = data.action;
		var _method_ = data._method_;
        
        _DATA.roominfo.isshup=action;
        
		if(action==0){
            $(":checkbox[id='stopspeak']").prop("checked",false);
		}
        
        if(action==1){
            $(":checkbox[id='stopspeak']").prop("checked",true);
		}


	},
	exam:function(data){
		var action = data.action;
		var _method_ = data._method_;

		if(action==0){

		}

		if(action==1){

		}

		if(action==3){
			Exam.upResult(data);
		}


	},
	practice:function(data){
		var action = data.action;
		var _method_ = data._method_;

		if(action==0){

		}

		if(action==1){

		}

		if(action==3){
			Practice.upResult(data);
		}


	},
	rob:function(data){
		var action = data.action;
		var _method_ = data._method_;

		if(action==0){

		}

		if(action==1){

		}

		if(action==3){
			Rob.upList(data);
		}
	},
	know:function(data){
		var action = data.action;
		var _method_ = data._method_;

		if(action==3){
			Know.upResult(data);
		}


	},
	ask:function(data){
		var action = data.action;
		var _method_ = data._method_;

		if(action==1){
			Chat.addAsk(data);
		}
		if(action==2){
			Chat.upAskNums(data);
		}
	}
}