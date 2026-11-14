# Re-recording the Little Steps tutorial

Seeds a sample family (Sofia, born 3.5 weeks early, with Mama, Papa, Lola and Tito Ben), drives the app in Chrome,
and writes `../little-steps-tutorial.mp4` (1920x1080, about 3 minutes 20 seconds).

    npm install
    npm run record

It needs Google Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`. Captions live in `CHAPTERS` in `record.js`.
The sample data is in `sample-data.js`. Nothing touches your real app data: recording uses a throwaway browser profile.
