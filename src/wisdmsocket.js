function WisdmSocket(socket) {
	var that=this;
	
	this.connect=function(host,port,callback) {_connect(host,port,callback);};
	this.isConnected=function() {return _isConnected();};
	this.disconnect=function() {_disconnect();};
	this.onMessage=function(callback) {m_message_handlers.push(callback);};
	this.onClose=function(callback) {m_close_handlers.push(callback);};
	this.sendMessage=function(msg) {_sendMessage(msg);};
	this.remoteAddress=function() {return (m_socket||{}).remoteAddress;};
	this.remotePort=function() {return (m_socket||{}).remotePort;};
	
	var m_socket=socket||null;
	var m_message_handlers=[];
	var m_close_handlers=[];
	var m_incoming_buffer='';
	var m_current_message='';
	var m_expected_current_message_length=0;
	var m_delimiter_1='[+++:::+++WisdmSocket-v001+++:::+++]';
	var m_delimiter_2='[---:::---WisdmSocket-v001---:::---]';
	var m_delimiter_3='[===:::===WisdmSocket-v001===:::===]';
	
	if (m_socket) initialize_socket();
	
	function _connect(host,port,callback) {
		if (m_socket) m_socket.destroy();
		m_socket=new require('net').Socket();
		initialize_socket();
		m_socket.connect(port,host,function() {
			callback({success:true});
		});
		m_socket.on('error',function(err) {
			callback({success:false,error:err});
		});
		m_socket.on('close',function() {
			m_close_handlers.forEach(function(handler) {handler();});
		});
	}
	
	function initialize_socket() {
		if (!m_socket) return;
		m_socket.on('data',function(data) {
			m_incoming_buffer+=data;
			process_incoming_buffer();
		});
		m_socket.on('close',function() {
			if (m_socket) m_socket.destroy();
			m_socket=null;
		});
		m_socket.on('error',function(err) {
			console.error('Socket error: '+err);
		});
	}
	
	function _disconnect() {
		if (!m_socket) return;
		//Question: should I use .end() here instead? why or why not?
		m_socket.destroy(); 
		m_socket=null;
	}
	
	function process_incoming_buffer() {
		while (do_process_incoming_buffer()); //process until returns fals
	}
	function do_process_incoming_buffer() {
		//returns true if there is more processing to be done
		if (m_expected_current_message_length>0) {
			var remaining=m_expected_current_message_length-m_current_message.length;
			if (m_incoming_buffer.length>remaining+m_delimiter_3.length) {
				m_current_message+=m_incoming_buffer.slice(0,remaining+m_delimiter_3.length);
				m_incoming_buffer=m_incoming_buffer.slice(remaining+m_delimiter_3.length);
			}
			else {
				m_current_message+=m_incoming_buffer;
				m_incoming_buffer='';
			}
			if (m_current_message.length==m_expected_current_message_length+m_delimiter_3.length) {
				var test_delim3=m_current_message.slice(m_expected_current_message_length);
				if (test_delim3==m_delimiter_3) {
					m_current_message=m_current_message.slice(0,m_expected_current_message_length);
					var msg;
					try {
						msg=JSON.parse(m_current_message);
					}
					catch(err) {
						msg={error:'Error parsing message!'};
						console.error('WisdmSocket: Error parsing message!');
					}
					m_current_message='';
					m_expected_current_message_length=0;
					for (var i=0; i<m_message_handlers.length; i++) {
						m_message_handlers[i](msg);
					}
				}
				else {
					console.error('WisdmSocket: Did not match end delimiter: '+test_delim3);
					m_current_message='';
					m_expected_current_message_length=0;
					m_incoming_buffer='';
				}
			}
			else if (m_current_message.length>m_expected_current_message_length+m_delimiter_3.length) {
				console.error('WisdmSocket: Unexpected problem: m_current_message.length>m_expected_current_message_length+m_delimiter_3.length');
				m_incoming_buffer='';
				m_current_message='';
				m_expected_current_message_length=0;
			}
		}
		if (m_expected_current_message_length===0) {
			if (m_incoming_buffer.length>=m_delimiter_1.length) {
				if (m_incoming_buffer.slice(0,m_delimiter_1.length)==m_delimiter_1) {
					var ind=m_incoming_buffer.indexOf(m_delimiter_2);
					if (ind>=0) {
						//found delimeters 1 and 2
						var size_string=m_incoming_buffer.slice(m_delimiter_1.length,ind);
						var size_num=Number(size_string);
						if ((size_num)&&(size_num>0)&&(size_num<=1000*1000*1000)) {
							m_expected_current_message_length=size_num;
							m_incoming_buffer=m_incoming_buffer.slice(ind+m_delimiter_2.length);
							return true; //more processing to be done
						}
						else {
							console.error('WisdmSocket: Unexpected size of message: '+size_num);
							m_incoming_buffer='';
							return false;
						}
					}
					else {
						//got delimiter 1 but not 2
						if (m_incoming_buffer.length>=m_delimiter_1.length+m_delimiter_2.length+30) {
							console.error('WisdmSocket: Unexpected problem -- never found second delimiter');
							m_incoming_buffer='';
							return false;
						}
						else {
							//I guess we haven't read the second delimiter
							return false;
						}
					}
				}
				else {
					console.error('WisdmSocket: Expected delimiter_1 but got: '+m_incoming_buffer.slice(0,m_delimiter_1.length));
					m_incoming_buffer='';
					return false;
				}
			}
			else return false;
		}
		else return false;
	}
	
	function _isConnected() {
		if (!m_socket) return false;
		return true;
	}
	
	function _sendMessage(msg) {
		var txt=JSON.stringify(msg);
		m_socket.write(m_delimiter_1+txt.length+m_delimiter_2+txt+m_delimiter_3);
	}
}

exports.WisdmSocket=WisdmSocket;
