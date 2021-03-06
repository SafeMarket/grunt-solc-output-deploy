# grunt-solc-output-deploy

> Deploy the outputs of solc

Works beautifully with [grunt-geth](https://github.com/SafeMarket/grunt-geth) and [grunt-solc](https://github.com/SafeMarket/grunt-solc)

## Getting Started
This plugin requires Grunt `~0.4.5`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install solc-output-deploy --save-dev 
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-solc-output-deploy');
```

## The "solc-output-deploy" task

Deploy solc output

```js
grunt.config.init({
    'solc-output-deploy':{
        development:{
            options:{
                rpchost:'localhost'
                ,rpcport:8101
                ,contracts:'contracts.json' //solc output
                ,chain:'chain.json'         //where to save contract runtimeBytecodes/addresses
                ,address: '0x00'            //optional; defaultAccount address. Uses web3.eth.accounts[0] by default
                ,deploy:[
                    'AliasReg'
                    ,'Keystore'
                    ,'OrderBook'
                ],onDeploy:{                //optional; javascript to eval
                    'OrderBook':[
                        "contracts['OrderBook'].set('CMC:TETH:USD', 830075000000, function(){});"
                        ,"contracts['OrderBook'].set('CMC:TETH:EUR', 782024448475, function(){});"
                        ,"contracts['OrderBook'].set('CMC:TETH:CNY', 5311462328050, function(){});"
                        ,"contracts['OrderBook'].set('CMC:TETH:CAD', 1107984940080, function(){});"
                        ,"contracts['OrderBook'].set('CMC:TETH:RUB', 55780151819800, function(){});"
                        ,"contracts['OrderBook'].set('CMC:TETH:BTC', 2306400000, function(){});"
                    ]
                }
            }
        }
    }
})
```
