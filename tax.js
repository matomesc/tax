task('build_less', 'compiles some less')
  .mkdir('-p test/build')
  .rm('-rf test/build/*')
  .lessc('test/less/index.less > test/build/index.css')
  .sync(function () {
    console.log('hi');
  })
  .watch('test/**', 'test/build/**');

task('task1', 'foobarz')
  .async(function (done) {
    setTimeout(function () {
      console.log('foo');
      done();
    }, 2000);
  });