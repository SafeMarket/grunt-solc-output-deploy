module.exports = function(grunt){

	grunt.loadNpmTasks('grunt-geth')
	grunt.loadTasks('tasks/')

	grunt.config.init({
		'solc-output-deploy':{
			development:{
				options:{
					rpchost:'localhost'
		            ,rpcport:8101
		            ,contracts:'contracts.json' //solc output
		            ,key:'key.json' //keyfile
		            ,password:'dev_password' //password to unlock key file
		            ,chain:'chain.json' //saved contract runtimeBytecodes/addresses
		            ,deploy:[
		                'AliasReg'
		                ,'Keystore'
		                ,'OrderBook'
		                ,'OpenStore'
		            ],onDeploy:{
		                OpenStore:[
		                    "thisContract.set('CMC:TETH:USD', 830075000000, function(){});"
		                    ,"thisContract.set('CMC:TETH:EUR', 782024448475, function(){});"
		                    ,"thisContract.set('CMC:TETH:CNY', 5311462328050, function(){});"
		                    ,"thisContract.set('CMC:TETH:CAD', 1107984940080, function(){});"
		                    ,"thisContract.set('CMC:TETH:RUB', 55780151819800, function(){});"
		                    ,"thisContract.set('CMC:TETH:BTC', 2306400000, function(){});"
		                ]
		            }
				}
			}
		},geth:{
			development:{
				options:{
					flags:{
						rpc: true
						,rpcport: 8101
						,mine: true
						,maxpeers: 0
						,datadir: '/tmp/grunt-solc-output-deploy'
						,etherbase: '0x'+grunt.file.readJSON('key.json').address
						,genesis: 'genesis.json'
						,networkid: 123
						,nodiscover: true
						,minerthreads: 1
					}
				}
			}
		}
	})
}