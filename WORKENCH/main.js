const timers = require("timers")
const kinsert = timers.internal_timers.insert

var tmout_f0 = (x)=> {
    console.log("i am function-0: "+x);
    console.log(new Date())
}
function get_timeout_cls() {
    let tmout = setTimeout(tmout_f0,2**31-1,'a')
    let cls = tmout.constructor 
    clearTimeout(tmout)
    tmout = null
    return(cls)
}

var Timeout = get_timeout_cls()


const { Worker } = require('worker_threads') 
  
function runService(workerData) { 
    return new Promise((resolve, reject) => { 
        const worker = new Worker( './gc.js', { workerData }); 
        worker.on('message', resolve); 
        worker.on('error', reject); 
        worker.on(
            'exit', 
            (code) => { 
                if (code !== 0) {
                    reject(new Error(`the exit code: ${code}`)); 
                }
            }
        ) 
    }) 
} 
  
async function run() { 
    const manual = timers.internal_timers.getTimerCallbacks().processTimers
    Array.from({length:4000000}).forEach((r,i)=>{
        var tmout = new Timeout(tmout_f0,2**31-1,[i],false,true)
        kinsert(tmout,2**31-1)
    })    
    const result = await runService(manual) 
} 
  
run().catch(err => console.error(err)) 
