function tst() {
    let p = new Promise(
        (rs,rj)=>{
            setTimeout(
                ()=>{rs("resolved")},
                3000
            )
        }
    )
    return(p)
}

console.log("!",x);


var x = await tst()

console.log("!!!!",x);
