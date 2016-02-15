
module.exports = function(grunt){

	grunt.registerMultiTask('solc-output-deploy',function(){

		var Web3 = require('web3')
			,HookedWeb3Provider = require("hooked-web3-provider")
			,Tx = require('ethereumjs-tx')
			,keythereum = require('keythereum')
			,Q = require('q')
		
		var done = this.async()
			,options = this.options({
				rpchost: 'localhost'
				,rpcport: 8545
				,forceRedeploy:false
			})
			,web3 = new Web3()
			,contractsObj = grunt.file.readJSON(options.contracts).contracts
			,keyObject = grunt.file.readJSON(options.key)
			,address = hexify(keyObject.address)
			,chain = grunt.file.exists(options.chain) ? grunt.file.readJSON(options.chain) : {}
			,rpcUrl = 'http://'+options.rpchost+':'+options.rpcport
			,requiredOptionKeys = ['contracts','key','chain','deploy']

		requiredOptionKeys.forEach(function(key){
			if(options[key]) return;

			grung.log.error('options.'+key,'missing');
			done(false)
		})

		web3.setProvider(new web3.providers.HttpProvider(rpcUrl));

		var contractsToDeploy = options.deploy.filter(function(contractName){
			if(chain[contractName] && hexify(contractsObj[contractName].runtimeBytecode) == web3.eth.getCode(chain[contractName].address)){
				grunt.log.writeln(contractName,'already deployed to',chain[contractName].address)
				return false
			}else{
				return true
			}
		})

		if(contractsToDeploy.length===0){
			grunt.log.success('No contracts to deploy')
			return done(true)
		}else{
			grunt.log.writeln(contractsToDeploy.length,'contracts need deployment')
		}

		grunt.log.writeln('Decrypting private key for address',address)

		var privateKey = keythereum.recover(options.password,keyObject)

		web3.setProvider(new HookedWeb3Provider({
			host: rpcUrl
			,transaction_signer: { 
			    hasAddress: function(_address, callback) {
			    	if(_address==address)
				    	callback(null,true)
				    else
				    	callback('Incorrect address',false)
			    },
			    signTransaction: function(txParams, callback) {
			    	var tx = new Tx(txParams)
			    	tx.sign(privateKey)
			    	callback(null,hexify(tx.serialize().toString('hex')))
			    }
			  }
		}))

		if(!web3.isConnected()){
			grunt.log.error('Web3 cannot connect on',options.rpchost,options.rpcport)
			return done(false)
		}		

		var deployPromises = contractsToDeploy.map(function(contractName){
			return new Deployment(contractName)
		})

		Q.all(deployPromises).then(function(){
			grunt.file.write(options.chain,JSON.stringify(chain))
			grunt.log.success('Deployed all contracts and wrote chain to',options.chain)
			done(true)
		})



		function Deployment(contractName){
			
			var deferred = Q.defer()
				,txParams = {
					from: hexify(address)
					,data: hexify(contractsObj[contractName].bytecode)
					,gasPrice: web3.toHex(web3.eth.gasPrice)
				}

			txParams.gasLimit = web3.toHex(web3.eth.estimateGas(txParams))
	
			web3.eth.sendTransaction(txParams,function(err,txHex){
				if(err){
					grunt.log.error('Deploying',contractName,'failed:',err.message)
					return done(false)
				}

				grunt.log.writeln('Deploying',contractName,'with transaction',txHex)

				waitForTx(txHex).then(function(transactionReceipt){

					grunt.log.writeln('Deployed',contractName,'to',transactionReceipt.contractAddress)

					chain[contractName] = {
						address:hexify(transactionReceipt.contractAddress)
						,runtimeBytecode:hexify(web3.eth.getCode(transactionReceipt.contractAddress))
					}

					deferred.resolve()

				})
			})

			return deferred.promise
		}

		function hexify(string){
			if(string.indexOf('0x')===0)
				return string
			else
				return '0x'+string
		}

		function waitForTx(txHex){
			var deferred = Q.defer()
				,waitInterval = setInterval(function(){

					var txReceipt = web3.eth.getTransactionReceipt(txHex)
					
					if(!txReceipt) return;

					clearInterval(waitInterval)
					deferred.resolve(txReceipt)

				},1000)

			return deferred.promise
		}


	})
}