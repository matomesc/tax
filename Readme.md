# tax

```simple node.js build tool```

## example

```javascript
// task definition

//
// a global function that calls to runner.createTask(name, description)
// every callback's this.args is a reference to an arguments object
//
task('build_less', 'compile less into ./static/less')
  .mkdir('-p ./build')
  .rm(function (done) {
    //
    // asynch stuff
    //
    
    console.log(this.args) // task arguments object
    
    done(err, './build/*');
  })
  .lessc(function (){
    // synch stuff
    return './less/index.less';
  })
  //
  // watches .watch(include, exclude) for changes and reinvokes the task
  // include and exclude is either an Array or String
  //
  .watch('./less/*', ['./build/index.less']);
```

## installation

`npm install -g blt`

## usage

You must first create a tax.js file like and define all of your tasks there. Then you can run your tasks:

`$ tax build_less -foo bar`

or list them

`$ tax -l`

## api

###.mkdir('./css')
the string must be a string valid for mkdir(1). we're just wrapping a child process here.
###.mkdir(cb)
cb is a synchronous or asynch function.  
cb gets one argument `(done)` which must be called when done: `done(err=null, string)`.  
if cb is synchronous, then it must return a string or an array of strings (which will be contatenated together).  

**_the rest of the api follows the same pattern_**

###.rm()
###.cp()
###.lessc()
###.hint()
###.test()
###.watch()

**_and of course_**

###.async()
###.sync()
###.exec()
