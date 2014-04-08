var spawn=require('child_process').spawn;

var process_timeout=5*60*1000; //every 5 minutes restart

var spawned_process=null;
var process_timer=new Date();

function do_launch_if_needed() {
	if (spawned_process) return;
	console.log ('Launching process: processingnodeclient.js');
	spawned_process=spawn('node',[__dirname+'/processingnodeclient.js','timeout='+process_timeout],{stdio: 'inherit'});
	process_timer=new Date();
	spawned_process.on('close',function() {
		var elapsed=(new Date())-process_timer;
		if (elapsed<process_timeout-1000) {
			console.error('Process closed unexpectedly before timeout: elapsed='+elapsed);
		}
		else {
			console.log ('Process closed: elapsed='+elapsed);
		}
		spawned_process=null;
		do_launch_if_needed();
	});
}
do_launch_if_needed();
