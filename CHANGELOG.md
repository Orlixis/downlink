# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.50](https://github.com/Orlixis/downlink/compare/v0.1.49...v0.1.50) (2026-08-21)


### Features

* implement background janitor service to clean up orphaned yt-dlp temporary files and staging directories ([f7154f4](https://github.com/Orlixis/downlink/commit/f7154f47cb0a917952cd415fb657e91e5ba9a993))

### [0.1.49](https://github.com/Orlixis/downlink/compare/v0.1.48...v0.1.49) (2026-08-21)

### [0.1.48](https://github.com/Orlixis/downlink/compare/v0.1.47...v0.1.48) (2026-08-21)

### [0.1.47](https://github.com/Orlixis/downlink/compare/v0.1.46...v0.1.47) (2026-08-21)


### Features

* implement multi-preview card system with compact quality selection and background continuity commands ([e219e8d](https://github.com/Orlixis/downlink/commit/e219e8d8a7c683a5b759cae3cfe1cfa5c075e81a))

### [0.1.46](https://github.com/Orlixis/downlink/compare/v0.1.45...v0.1.46) (2026-08-21)


### Features

* add update tracking state to hooks and update configuration for improved auto-updater reliability ([6692a7e](https://github.com/Orlixis/downlink/commit/6692a7e8471e35ded0c3694476aa8dab6c290eeb))

### [0.1.45](https://github.com/Orlixis/downlink/compare/v0.1.44...v0.1.45) (2026-08-21)


### Features

* add download task editing and automatic orphaned/missing file cleanup utility ([12533fc](https://github.com/Orlixis/downlink/commit/12533fc30c1b99aa86df8ab9438bde28a2038d0c))

### [0.1.44](https://github.com/Orlixis/downlink/compare/v0.1.43...v0.1.44) (2026-08-21)


### Features

* add clipboard banner for URL suggestions and refactor preview animations for smoother transitions ([60df133](https://github.com/Orlixis/downlink/commit/60df133aa0f497d3e9ec293ded3c8e9cfdf9e919))
* add Whisper-based audio transcription UI for individual downloads and refine Footer status indicators ([fc23a57](https://github.com/Orlixis/downlink/commit/fc23a57ca0cf90aad67ab78064763d009e7acf62))

### [0.1.43](https://github.com/Orlixis/downlink/compare/v0.1.42...v0.1.43) (2026-08-21)


### Features

* implement comprehensive UI components for settings, preview, and download management ([cd8c61c](https://github.com/Orlixis/downlink/commit/cd8c61c1739e4a5db553f9a0de5767a2d546b173))


### Bug Fixes

* **downloader:** ensure 1:1 raw progress sync between yt-dlp and UI card ([07ed811](https://github.com/Orlixis/downlink/commit/07ed81181585dffd4bad65b70add74275a1595a3))
* **frontend:** resolve Next.js hydration mismatch on queueWidth localStorage reading ([203a507](https://github.com/Orlixis/downlink/commit/203a507713a6508e176f661d748c83d106cde72e))

### [0.1.42](https://github.com/Orlixis/downlink/compare/v0.1.41...v0.1.42) (2026-08-21)


### Features

* add automatic cleanup for stale temporary files and remove task-specific temp directories upon completion or cancellation ([35604ef](https://github.com/Orlixis/downlink/commit/35604efc8f282b0f4927bbe6cbd2a8500e7fbcfb))
* improve title inference by filtering metadata tokens and decoding base64-encoded URL segments ([b795398](https://github.com/Orlixis/downlink/commit/b7953983ddbec3f0b8b8bc0cd64356229abfc601))


### Bug Fixes

* **downloader:** auto-remux disguised HLS streams, extract video poster thumbnails, and sanitize base64 titles ([fe10c36](https://github.com/Orlixis/downlink/commit/fe10c3657675a501720325aed1e85215ceb137b8))
* **downloader:** enforce filename trimming and clean title template to prevent [Errno 63] File name too long ([2db39ca](https://github.com/Orlixis/downlink/commit/2db39ca4c6295defdbf20f5dbf4b98295924251d))
* **downloader:** route fragments to temp staging directory and fix single-stream progress calculation ([68ec538](https://github.com/Orlixis/downlink/commit/68ec53824a5b624a822d3d9eafd0c5a5c54acc59))
* **downloader:** task-isolated temp directories with automatic cleanup on completion, cancellation, and startup ([8f0c822](https://github.com/Orlixis/downlink/commit/8f0c822ed1be43a908ea2efccc09996332dd71c9))

### [0.1.41](https://github.com/Orlixis/downlink/compare/v0.1.39...v0.1.41) (2026-08-20)


### Features

* improve yt-dlp stream sniffing with header injection, URL-based title inference, and persistent stream/referer metadata. ([f25a396](https://github.com/Orlixis/downlink/commit/f25a396a94ec36b1d45f2e8c50f5b86745aed121))

### [0.1.39](https://github.com/Orlixis/downlink/compare/v0.1.38...v0.1.39) (2026-07-22)


### Features

* add FetchProgress event type and update metadata state to support fetch hints ([a6e652d](https://github.com/Orlixis/downlink/commit/a6e652de5c750ee577782487477552d808fd444e))

### [0.1.38](https://github.com/Orlixis/downlink/compare/v0.1.37...v0.1.38) (2026-07-22)


### Features

* implement backend fetch progress hints and add react-player support ([e3aa983](https://github.com/Orlixis/downlink/commit/e3aa9839d373a93fe247cb65dba88e82717caeb6))

### [0.1.37](https://github.com/Orlixis/downlink/compare/v0.1.36...v0.1.37) (2026-07-11)

### [0.1.36](https://github.com/Orlixis/downlink/compare/v0.1.35...v0.1.36) (2026-07-11)


### Features

* enable mica and blur window effects and update global CSS for transparency ([edae9fb](https://github.com/Orlixis/downlink/commit/edae9fb61b46d28352fe81419bf366fc37cd586c))
* replace react-player with vidstack for improved media handling and add trim modal support ([7f0d271](https://github.com/Orlixis/downlink/commit/7f0d271d7aac184bce97f22628041ccb5707cf22))

### [0.1.35](https://github.com/Orlixis/downlink/compare/v0.1.34...v0.1.35) (2026-07-11)

### [0.1.34](https://github.com/Orlixis/downlink/compare/v0.1.33...v0.1.34) (2026-07-11)


### Features

* add Mux player integration and orbiting package component ([183064d](https://github.com/Orlixis/downlink/commit/183064d5c32ac505603f6719dc5e3ba58c848019))

### [0.1.33](https://github.com/Orlixis/downlink/compare/v0.1.32...v0.1.33) (2026-07-11)


### Features

* implement gravity-based cursor movement for clipboard pill in BlackHoleOverlay ([94e3332](https://github.com/Orlixis/downlink/commit/94e33321f82d1ff709b1b037173ec6dee9098d66))

### [0.1.32](https://github.com/Orlixis/downlink/compare/v0.1.31...v0.1.32) (2026-07-11)


### Features

* implement Black Hole particle physics simulation using Canvas API and custom hook ([5486a87](https://github.com/Orlixis/downlink/commit/5486a877decffad6daac5f21c84a9f46041f7dd6))

### [0.1.31](https://github.com/Orlixis/downlink/compare/v0.1.30...v0.1.31) (2026-07-11)


### Features

* update audio system with portal idle loop, custom throw sounds, and directional bounce effects ([6d0f927](https://github.com/Orlixis/downlink/commit/6d0f927d1a55ff4b2ad9c5d0425297181916e52b))

### [0.1.30](https://github.com/Orlixis/downlink/compare/v0.1.29...v0.1.30) (2026-07-11)


### Features

* add AI transcription support, trim slider component, and global sound management system ([932a022](https://github.com/Orlixis/downlink/commit/932a022d5b51b46ce21c5650e7f2862d38e966d7))


### Bug Fixes

* **docs:** bypass GitHub API rate limit for download links ([0b6b065](https://github.com/Orlixis/downlink/commit/0b6b065542c6dd78ef467bb92b30dbad53ba1469))

### [0.1.29](https://github.com/Orlixis/downlink/compare/v0.1.28...v0.1.29) (2026-07-10)


### Features

* enable window dragging capabilities and set default dark mode theme ([76e6d98](https://github.com/Orlixis/downlink/commit/76e6d98399e338d2468efc7c5689d3e989e12149))

### [0.1.28](https://github.com/Orlixis/downlink/compare/v0.1.27...v0.1.28) (2026-07-10)

### [0.1.27](https://github.com/Orlixis/downlink/compare/v0.1.26...v0.1.27) (2026-07-09)


### Features

* add non-mac platform detection and refine drag region implementation for HeaderBar ([312e005](https://github.com/Orlixis/downlink/commit/312e00551972257dcf95e23bd99efc62c092252c))
* implement cinematic black hole and drop zone UI components with GSAP animations ([2374ce4](https://github.com/Orlixis/downlink/commit/2374ce4d708e4ef96eb210783e60c15e2c737bb5))

### [0.1.26](https://github.com/Orlixis/downlink/compare/v0.1.25...v0.1.26) (2026-07-09)

### [0.1.25](https://github.com/Orlixis/downlink/compare/v0.1.24...v0.1.25) (2026-07-08)

### [0.1.24](https://github.com/Orlixis/downlink/compare/v0.1.23...v0.1.24) (2026-07-08)


### Features

* add postbump script to sync lockfiles after version updates ([17728b6](https://github.com/Orlixis/downlink/commit/17728b645d398721603a251441e7d20d9dce232c))

### [0.1.23](https://github.com/Orlixis/downlink/compare/v0.1.22...v0.1.23) (2026-07-08)

### [0.1.22](https://github.com/Orlixis/downlink/compare/v0.1.21...v0.1.22) (2026-07-08)


### Features

* implement animated morphing transitions for download previews using GSAP ([4744918](https://github.com/Orlixis/downlink/commit/4744918ffd6d05746bfb5f57a8ab878492724292))
* implement multi-stream download progress tracking and GSAP-based entry/exit animations for preview panels. ([074e20d](https://github.com/Orlixis/downlink/commit/074e20d73fc392a5e8637f3ca6fa9a08f5c20d7a))
* implement window drag region and hide native title bar for custom UI styling ([d97c202](https://github.com/Orlixis/downlink/commit/d97c202e6094d4d08268acaf05e815db470ae96e))

### [0.1.21](https://github.com/Orlixis/downlink/compare/v0.1.19...v0.1.21) (2026-07-08)


### Features

* add OEmbed proxy command and download completion notifications, and refine modal animation sizing ([12b72db](https://github.com/Orlixis/downlink/commit/12b72db8949b3ff6d798d7ad1777ab3eb1be1c50))
* add OEmbed proxy command and download completion notifications, and refine modal animation sizing ([7e2ba20](https://github.com/Orlixis/downlink/commit/7e2ba203792c6f40c22e3b566d42cf0b433a6d22))
* implement interactive update modal with manual trigger, download progress, and restart functionality ([0968c74](https://github.com/Orlixis/downlink/commit/0968c7417061bc4acd95694404658cba55ac6800))

### [0.1.20](https://github.com/Orlixis/downlink/compare/v0.1.19...v0.1.20) (2026-07-08)


### Features

* implement interactive update modal with manual trigger, download progress, and restart functionality ([0968c74](https://github.com/Orlixis/downlink/commit/0968c7417061bc4acd95694404658cba55ac6800))

### [0.1.19](https://github.com/Orlixis/downlink/compare/v0.1.18...v0.1.19) (2026-07-08)


### Features

* implement clipboard URL detection banner and per-domain download concurrency limiting ([b7327db](https://github.com/Orlixis/downlink/commit/b7327db284cfd1ddcb3cbe104bd74c1f79fb563b))


### Bug Fixes

* make GitHub Pages fetch the correct latest release ([888df65](https://github.com/Orlixis/downlink/commit/888df650ac537b66c2898af17e7b27cba3431ee6))

### [0.1.18](https://github.com/Orlixis/downlink/compare/v0.1.17...v0.1.18) (2026-07-08)

### [0.1.17](https://github.com/Orlixis/downlink/compare/v0.1.16...v0.1.17) (2026-07-08)
