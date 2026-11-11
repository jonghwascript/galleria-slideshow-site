const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const fileInclude = require('gulp-file-include');
const browserSync = require('browser-sync').create();

const DIST_DIR = 'dist';
const PRETTIER_GLOBS = [
  'src/**/*.html',
  'src/scss/**/*.scss',
  'src/js/**/*.js',
  'gulpfile.js',
];
const STATIC_FILES = ['src/*.json', 'src/{js,images,fonts}/**/*'];

async function cleanTask() {
  const { rm } = await import('node:fs/promises');
  await rm(DIST_DIR, { recursive: true, force: true });
}

function scssTask() {
  return gulp
    .src('src/scss/style.scss')
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(`${DIST_DIR}/css`));
}

function htmlTask() {
  return gulp
    .src('src/pages/*.html')
    .pipe(
      fileInclude({
        prefix: '@@',
        basepath: '@file',
      }),
    )
    .pipe(gulp.dest(DIST_DIR));
}

function staticTask() {
  return gulp
    .src(STATIC_FILES, { base: 'src', encoding: false })
    .pipe(gulp.dest(DIST_DIR));
}

function dataTask() {
  return gulp
    .src('src/pages/data.json', { encoding: false })
    .pipe(gulp.dest(DIST_DIR));
}

// 파일을 다 쓸 때까지 기다리고, 파싱 오류가 나면 태스크를 실패로 끝낸다.
// (async 함수가 스트림을 반환하면 gulp는 쓰기가 끝나기 전에 완료로 처리한다.)
async function prettierTask() {
  const { pipeline } = await import('node:stream/promises');
  const { default: prettier } = await import('gulp-prettier');
  await pipeline(
    gulp.src(PRETTIER_GLOBS, { base: '.' }),
    prettier(),
    gulp.dest('.'),
  );
}

const buildTask = gulp.series(
  cleanTask,
  gulp.parallel(scssTask, htmlTask, staticTask, dataTask),
);

function serveTask(done) {
  browserSync.init(
    {
      server: {
        baseDir: DIST_DIR,
        directory: true,
        serveStaticOptions: { index: false },
      },
      files: [`${DIST_DIR}/**/*`, `!${DIST_DIR}/**/*.map`],
      watchEvents: ['add', 'change', 'unlink'],
      port: 3000,
      open: true,
      ui: false,
      notify: false,
    },
    done,
  );
}

function watchTask() {
  gulp.watch('src/scss/**/*.scss', scssTask);
  gulp.watch(['src/pages/**/*.html', 'src/partials/**/*.html'], htmlTask);
  gulp.watch(STATIC_FILES, staticTask);
  gulp.watch('src/pages/data.json', dataTask);
}

exports.clean = cleanTask;
exports.scss = scssTask;
exports.html = htmlTask;
exports.static = staticTask;
exports.data = dataTask;
exports.prettier = prettierTask;
exports.build = buildTask;
exports.default = gulp.series(buildTask, serveTask, watchTask);
