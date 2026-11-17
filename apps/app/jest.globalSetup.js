/* global module, process */
// Runs once in the real Node process before any test file. Tests that depend on a
// time zone (profileService) need it fixed, and assigning process.env.TZ from inside
// a test file does not change the real process under Jest, so it is set here. CI
// runners use UTC and developer machines use their own zone, so without this the
// results would differ between machines.
module.exports = async () => {
  process.env.TZ = 'Asia/Colombo';
};
