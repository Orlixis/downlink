/**
 * Downlink Companion — Universal Media Sniffer, Auto-Hiding Cinema Mode & Liquid Glass HUD
 * Uses Isolated Shadow DOM (AdBlock-Immune) + Vector Downlink Brand Identity
 */

(() => {
  // 1. Purge any orphaned or legacy docks from previous scripts / frames
  try {
    document.querySelectorAll('downlink-extension-dock, #__downlink_dock_v1__, [id^="__downlink"]').forEach((el) => {
      el.remove();
    });
  } catch (e) {}

  // 2. Singleton Frame Guard: Only mount the interactive floating dock in the top-level window
  if (window.self !== window.top) {
    return;
  }

  if (window.__DOWNLINK_DOCK_MOUNTED__) {
    return;
  }
  window.__DOWNLINK_DOCK_MOUNTED__ = true;

  // Clean SVG Icons & Authentic Downlink Vector Logo (Zero external images, zero emojis, 100% vector precision)
  const ICONS = {
    downlinkLogo: `<svg class="dl-logo" viewBox="0 0 1583 1583" width="18" height="18" fill="none">
      <defs>
        <linearGradient id="dl-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="1583" height="1583" rx="360" fill="url(#dl-logo-bg)"/>
      <path fill="#ffffff" fill-rule="evenodd" d="M 255.500 288.337 C 243.334 291.415, 233.749 299.188, 228.428 310.291 C 225.380 316.651, 225 318.357, 225 325.685 C 225 342.335, 228.783 347.717, 269.498 389 C 286.584 406.325, 309.992 430.175, 321.514 442 C 355.571 476.952, 361.658 482.065, 372.938 485.193 C 380.969 487.419, 384.749 487.453, 393.931 485.379 C 402.797 483.377, 411.110 477.621, 415.887 470.176 C 420.248 463.381, 423.953 452.639, 423.979 446.718 C 424.010 439.567, 419.061 427.775, 412.657 419.741 C 409.694 416.023, 381.283 386.657, 349.522 354.483 C 291.992 296.206, 291.741 295.969, 283.236 291.754 C 275.922 288.130, 273.681 287.491, 267.599 287.298 C 263.695 287.173, 258.250 287.641, 255.500 288.337 M 699 311.865 C 682.447 318.380, 672.294 332.768, 671.806 350.403 C 671.576 358.710, 673.502 364.705, 679.064 373 C 688.381 386.894, 713.746 413.230, 723.170 418.797 C 738.289 427.727, 759.386 423.992, 772.239 410.108 C 780.425 401.266, 782.294 396.625, 782.795 383.884 C 783.451 367.192, 781.469 363.995, 751.821 333.906 C 734.739 316.570, 733.043 315.133, 726.739 312.656 C 718.383 309.373, 706.213 309.026, 699 311.865 M 497.497 320.737 C 489.611 323.556, 480.876 330.248, 477.258 336.244 C 470.473 347.486, 469.497 350.674, 469.532 361.500 C 469.561 370.505, 469.847 372.047, 472.413 377 C 477.024 385.902, 481.341 390.695, 518.350 428 C 573.792 483.883, 609.533 520.460, 621.936 534.008 C 628.226 540.879, 648.476 561.815, 666.936 580.533 C 685.396 599.252, 709.251 623.777, 719.947 635.033 C 730.642 646.290, 752.251 668.550, 767.966 684.500 C 827.878 745.309, 832.604 751.288, 832.357 765.963 C 832.206 774.957, 830.250 780.769, 825.366 786.729 C 820.570 792.581, 815.243 795.970, 808.254 797.615 C 800.241 799.500, 794.959 799.331, 788.696 796.987 C 778.106 793.025, 782.533 797.313, 670.477 682.469 C 649.565 661.036, 620.220 630.900, 605.267 615.500 C 590.313 600.100, 561.749 571.013, 541.789 550.862 C 499.679 508.347, 501.484 509.625, 483.500 509.545 C 474.675 509.505, 472.824 509.817, 467.747 512.196 C 446.885 521.973, 437.208 547.761, 446.965 567.580 C 448.763 571.232, 452.988 577.433, 456.353 581.360 C 462.583 588.628, 493.649 621.202, 527.061 655.500 C 537.241 665.950, 548.044 677.200, 551.068 680.500 C 567.083 697.977, 590.628 722.743, 608.114 740.504 C 631.382 764.139, 633.108 766.908, 633.353 781 C 633.477 788.191, 633.129 790.226, 631.091 794.213 C 622.506 811.011, 601.207 818.268, 584.903 809.950 C 582.336 808.641, 567.082 794.111, 544.635 771.596 C 501.762 728.591, 503.039 729.500, 485.500 729.500 C 475.204 729.500, 474.069 729.704, 467.759 732.693 C 451.918 740.197, 443.363 754.867, 444.144 773.189 C 444.714 786.579, 447.724 791.588, 467.375 811.845 C 476.261 821.005, 494.078 839.525, 506.969 853 C 519.860 866.475, 543.703 890.893, 559.953 907.262 C 576.204 923.630, 598.950 946.785, 610.500 958.717 C 622.050 970.649, 641.959 991.007, 654.742 1003.956 C 667.525 1016.905, 677.987 1028.217, 677.992 1029.094 C 678 1030.693, 620.830 1087.917, 605.153 1102.001 C 585.562 1119.603, 576.458 1135.798, 573.884 1157.625 C 570.612 1185.363, 580.512 1209.988, 601.946 1227.426 C 616.439 1239.217, 628.476 1242.689, 664.500 1245.470 C 672.598 1246.096, 699.191 1249.019, 737.500 1253.496 C 764.226 1256.619, 784.455 1258.789, 794 1259.557 C 798.125 1259.889, 813.425 1261.495, 828 1263.125 C 842.575 1264.756, 859 1266.524, 864.500 1267.053 C 870 1267.582, 881.700 1268.898, 890.500 1269.977 C 899.300 1271.057, 916.625 1272.874, 929 1274.017 C 956.448 1276.552, 985.002 1279.488, 1007 1282.036 C 1016.075 1283.087, 1027.325 1284.219, 1032 1284.552 C 1036.675 1284.885, 1051.525 1286.458, 1065 1288.047 C 1078.475 1289.637, 1094.675 1291.423, 1101 1292.018 C 1114.657 1293.301, 1142.093 1296.281, 1165 1298.969 C 1174.075 1300.034, 1188.025 1301.374, 1196 1301.946 C 1203.975 1302.518, 1215.675 1303.677, 1222 1304.522 C 1240.053 1306.934, 1248.936 1307.342, 1257.532 1306.152 C 1281.668 1302.811, 1305.134 1286.054, 1315.376 1264.845 C 1321.918 1251.296, 1324.002 1241.982, 1323.992 1226.333 C 1323.988 1219.275, 1323.547 1210.800, 1323.011 1207.500 C 1322.083 1201.777, 1320.355 1183.795, 1318.014 1155.500 C 1317.422 1148.350, 1316.042 1131.700, 1314.946 1118.500 C 1313.850 1105.300, 1312.076 1086.625, 1311.004 1077 C 1309.931 1067.375, 1308.593 1052.360, 1308.030 1043.633 C 1307.466 1034.907, 1306.349 1022.082, 1305.547 1015.133 C 1303.956 1001.349, 1301.407 972.276, 1299.924 951 C 1299.407 943.575, 1298.544 934.350, 1298.007 930.500 C 1297.469 926.650, 1296.551 917.650, 1295.965 910.500 C 1295.380 903.350, 1294.469 894.575, 1293.941 891 C 1293.413 887.425, 1292.543 876.850, 1292.006 867.500 C 1291.469 858.150, 1290.356 844.875, 1289.531 838 C 1287.677 822.540, 1285.333 796.571, 1283.516 771.345 C 1282.757 760.810, 1281.659 747.760, 1281.075 742.345 C 1278.156 715.249, 1275.917 690.877, 1274.982 676 C 1274.411 666.925, 1273.308 652.750, 1272.532 644.500 C 1271.755 636.250, 1270.824 625.450, 1270.464 620.500 C 1269.606 608.727, 1265.918 593.762, 1261.921 585.837 C 1254.477 571.077, 1241.249 557.849, 1227.514 551.431 C 1214.235 545.225, 1211.318 544.612, 1195 544.599 C 1181.559 544.588, 1179.952 544.791, 1173 547.385 C 1159.527 552.411, 1152.791 557.308, 1132.022 577.176 C 1121.285 587.447, 1101.040 607.360, 1087.032 621.426 C 1073.025 635.491, 1061.100 646.997, 1060.532 646.993 C 1059.965 646.989, 1058.397 645.302, 1057.049 643.243 C 1055.700 641.184, 1043.550 628.474, 1030.049 614.998 C 1001.781 586.784, 954.180 538.454, 906 489.049 C 887.575 470.155, 870.250 453.003, 867.500 450.932 C 860.982 446.025, 851.572 442.905, 843.045 442.825 C 834.498 442.745, 830.868 443.561, 823.668 447.180 C 815.907 451.081, 810.034 457.154, 805.899 465.554 C 802.653 472.147, 802.501 472.955, 802.512 483.479 C 802.520 490.032, 803.062 496.033, 803.851 498.282 C 805.914 504.170, 815.407 516.148, 830.709 532.174 C 848.504 550.810, 850.159 553.529, 850.288 564.341 C 850.474 580.015, 844.823 590.096, 832.808 595.525 C 827.431 597.955, 825.172 598.385, 817.500 598.438 C 802.304 598.543, 801.816 598.197, 767.101 562.745 C 750.820 546.119, 706.225 500.773, 668 461.977 C 629.775 423.182, 584.229 376.919, 566.786 359.171 C 536.210 328.061, 534.793 326.773, 527.286 323.274 C 520.642 320.177, 518.253 319.594, 511 319.297 C 504.666 319.038, 501.225 319.405, 497.497 320.737 M 329.764 576.086 C 327.159 576.495, 321.876 578.283, 318.023 580.059 C 298.213 589.190, 288.744 613.656, 297.564 632.921 C 300.825 640.044, 304.330 644.247, 323.478 664 C 357.345 698.936, 361.204 702.585, 368 706.094 C 374.205 709.298, 374.999 709.452, 385.500 709.475 C 395.666 709.498, 396.955 709.277, 402.500 706.564 C 409.747 703.018, 418.859 694.199, 422.254 687.446 C 425.927 680.140, 427.321 670.548, 425.915 662.250 C 424.029 651.120, 420.178 645.185, 404.016 628.500 C 396.025 620.250, 384.350 608.100, 378.072 601.500 C 362.627 585.262, 356.559 580.506, 348.201 578.092 C 339.578 575.601, 335.603 575.168, 329.764 576.086 M 900 627.406 C 886.532 631.209, 878.981 639.781, 876.460 654.130 C 875.670 658.626, 878.155 668.773, 881.364 674.154 C 882.657 676.322, 900.316 694.864, 920.607 715.358 C 940.898 735.853, 970.042 765.705, 985.370 781.698 C 1020.452 818.299, 1024.225 820.779, 1040.771 818.114 C 1051.563 816.376, 1059.740 808.645, 1063.925 796.222 C 1067.335 786.099, 1066.347 778.637, 1060.413 769.698 C 1058.880 767.389, 1044.979 752.675, 1029.521 737 C 1014.063 721.325, 985.685 692.358, 966.458 672.630 C 947.231 652.901, 929.510 635.229, 927.077 633.357 C 919.987 627.904, 907.756 625.216, 900 627.406 M 685 842.873 C 667.637 848.605, 658.457 865.621, 663.955 881.887 C 665.142 885.399, 667.660 890.691, 669.551 893.647 C 671.442 896.603, 685.029 911.282, 699.744 926.268 C 714.460 941.255, 729.866 957.112, 733.979 961.508 C 759.143 988.397, 792.149 1021.141, 797.721 1024.742 C 805.599 1029.833, 815.068 1032.507, 822.218 1031.661 C 829.141 1030.841, 839.320 1025.758, 842.569 1021.499 C 851.275 1010.084, 850.972 993.712, 841.829 981.519 C 839.998 979.078, 816.410 954.450, 789.412 926.790 C 706.912 842.269, 714.269 849.450, 706.630 845.986 C 699.491 842.749, 689.661 841.334, 685 842.873"/>
    </svg>`,
    downlink: `<svg class="dl-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
    chevron: `<svg class="dl-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
    check: `<svg class="dl-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    zap: `<svg class="dl-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    music: `<svg class="dl-music" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    video: `<svg class="dl-video" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`
  };

  let activePlayerEl = null;
  let dockHost = null;
  let shadowRoot = null;
  let isOpen = false;
  let selectedPreset = 'recommended_best';
  let autoHideTimer = null;
  let isHoveringDock = false;

  /**
   * Cleans and canonicalizes video URLs
   */
  function normalizeVideoUrl(rawUrl) {
    if (!rawUrl) return window.location.href;
    
    // 1. Dailymotion canonical extraction
    const dmMatch = rawUrl.match(/(?:geo\.dailymotion\.com\/player[^\s"'<>]*[?&]video=|[?&]video=|\/embed\/video\/|\/video\/)([a-zA-Z0-9]+)/i);
    if (dmMatch && dmMatch[1]) {
      return `https://www.dailymotion.com/video/${dmMatch[1]}`;
    }

    // 2. YouTube: If inside an algorithmic Radio Mix (list=RD...), strip list=RD... parameter
    if (rawUrl.includes('youtube.com/watch') || rawUrl.includes('youtu.be/')) {
      try {
        const u = new URL(rawUrl);
        const listParam = u.searchParams.get('list');
        if (listParam && listParam.startsWith('RD')) {
          u.searchParams.delete('list');
          u.searchParams.delete('index');
          return u.toString();
        }
      } catch (e) {}
    }

    return rawUrl;
  }

  /**
   * Smart Cinema Auto-Hide Manager
   */
  function showDockTemporarily(durationMs = 3200) {
    if (!shadowRoot) return;
    const container = shadowRoot.querySelector('.dl-dock-container');
    if (!container) return;

    container.classList.add('dl-visible');

    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
    }

    if (!isOpen && !isHoveringDock) {
      autoHideTimer = setTimeout(() => {
        if (!isOpen && !isHoveringDock) {
          container.classList.remove('dl-visible');
        }
      }, durationMs);
    }
  }

  /**
   * Spawns an Apple-Tier Cosmic Gravity Particle that shoots into the Downlink Queue
   */
  function launchGravityOrb(startX, startY) {
    if (!shadowRoot) return;

    const container = shadowRoot.querySelector('.dl-dock-container');
    const targetRect = container ? container.getBoundingClientRect() : { top: 20, right: 20, width: 140, height: 36 };
    const endX = window.innerWidth - targetRect.right + (targetRect.width / 2);
    const endY = targetRect.top + (targetRect.height / 2);

    const orb = document.createElement('div');
    orb.className = 'dl-gravity-orb';
    orb.style.left = `${startX}px`;
    orb.style.top = `${startY}px`;

    shadowRoot.appendChild(orb);

    // Stardust trail particles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const dust = document.createElement('div');
        dust.className = 'dl-stardust';
        dust.style.left = `${startX + (Math.random() * 20 - 10)}px`;
        dust.style.top = `${startY + (Math.random() * 20 - 10)}px`;
        shadowRoot.appendChild(dust);
        setTimeout(() => dust.remove(), 600);
      }, i * 40);
    }

    requestAnimationFrame(() => {
      orb.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.2)`;
      orb.style.opacity = '0';
    });

    setTimeout(() => {
      orb.remove();
      // Trigger shockwave on dock
      if (container) {
        container.classList.add('shockwave');
        setTimeout(() => container.classList.remove('shockwave'), 800);
      }
    }, 650);
  }

  /**
   * Displays the Apple-tier Liquid Glass Dynamic Island HUD at top of the browser
   */
  function showDynamicIslandHUD(titleText = 'Queued in Downlink', subText = 'Downloading in 4K Video Quality') {
    if (!shadowRoot) return;

    let hud = shadowRoot.querySelector('.dl-dynamic-island');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'dl-dynamic-island';
      shadowRoot.appendChild(hud);
    }

    hud.innerHTML = `
      <div class="dl-island-body">
        <div class="dl-island-leading">
          ${ICONS.downlinkLogo}
          <div class="dl-island-pulse"></div>
        </div>
        <div class="dl-island-content">
          <div class="dl-island-title">${titleText}</div>
          <div class="dl-island-subtitle">${subText}</div>
        </div>
        <div class="dl-island-badge">
          ${ICONS.check}
          <span>Sent to App</span>
        </div>
      </div>
      <div class="dl-island-shimmer"></div>
    `;

    hud.classList.remove('active');
    void hud.offsetWidth; // Trigger reflow
    hud.classList.add('active');

    setTimeout(() => {
      hud.classList.remove('active');
    }, 3800);
  }

  /**
   * Initializes the Isolated Shadow DOM Host.
   */
  function initDock() {
    if (dockHost && dockHost.isConnected) return shadowRoot;

    dockHost = document.createElement('downlink-extension-dock');
    dockHost.id = '__downlink_dock_v1__';
    dockHost.style.cssText = `
      all: initial !important;
      position: fixed !important;
      top: 0px !important;
      left: 0px !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      display: block !important;
      overflow: visible !important;
    `;

    shadowRoot = dockHost.attachShadow({ mode: 'open' });

    // Inject Shadow-isolated CSS Styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Stealth Cinema Mode: Hidden by default, smoothly reveals on hover / video proximity */
      .dl-dock-container {
        position: fixed !important;
        top: 20px;
        right: 20px;
        pointer-events: none !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif !important;
        user-select: none !important;
        opacity: 0;
        transform: translateY(-8px) scale(0.92);
        transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    top 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                    right 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        display: block !important;
        z-index: 2147483647 !important;
      }

      /* Visible State (Active on video hover, proximity, or modal open) */
      .dl-dock-container.dl-visible {
        opacity: 0.95 !important;
        transform: translateY(0) scale(1) !important;
        pointer-events: auto !important;
      }

      .dl-dock-container.dl-visible:hover {
        opacity: 1 !important;
        transform: translateY(-1px) scale(1.03) !important;
      }

      .dl-dock-container.shockwave .dl-pill {
        animation: dl-pulse-glow 0.6s ease-out;
      }

      @keyframes dl-pulse-glow {
        0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.8), 0 8px 32px rgba(0, 0, 0, 0.6); }
        50% { box-shadow: 0 0 35px 8px rgba(56, 189, 248, 0.6), 0 12px 40px rgba(0, 0, 0, 0.8); }
        100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0), 0 8px 32px rgba(0, 0, 0, 0.6); }
      }

      /* Liquid Glass Pill */
      .dl-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 6px 12px 6px 8px !important;
        background: rgba(13, 17, 23, 0.88) !important;
        backdrop-filter: blur(28px) saturate(200%) !important;
        -webkit-backdrop-filter: blur(28px) saturate(200%) !important;
        border: 1px solid rgba(56, 189, 248, 0.45) !important;
        border-radius: 9999px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6),
                    0 0 16px rgba(56, 189, 248, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .dl-pill:hover {
        background: rgba(15, 23, 42, 0.96) !important;
        border-color: rgba(56, 189, 248, 0.85);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75),
                    0 0 24px rgba(56, 189, 248, 0.45),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
      }

      .dl-pill:active {
        transform: scale(0.97) !important;
      }

      .dl-brand {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }

      .dl-logo {
        width: 18px !important;
        height: 18px !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;
        flex-shrink: 0 !important;
        display: block !important;
      }

      .dl-title {
        font-size: 11.5px !important;
        font-weight: 700 !important;
        letter-spacing: -0.2px !important;
        color: #f8fafc !important;
        line-height: 1 !important;
      }

      .dl-action-badge {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        background: rgba(56, 189, 248, 0.18) !important;
        border: 1px solid rgba(56, 189, 248, 0.35) !important;
        padding: 3px 8px !important;
        border-radius: 9999px !important;
        color: #38bdf8 !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        transition: all 0.15s ease !important;
      }

      .dl-pill:hover .dl-action-badge {
        background: rgba(56, 189, 248, 0.32) !important;
        border-color: rgba(56, 189, 248, 0.7) !important;
        color: #ffffff !important;
      }

      .dl-chevron {
        width: 10px !important;
        height: 10px !important;
        transition: transform 0.2s ease !important;
      }

      .dl-dock-container.captured .dl-pill {
        background: rgba(6, 78, 59, 0.92) !important;
        border-color: rgba(52, 211, 153, 0.8) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(52, 211, 153, 0.35) !important;
      }

      .dl-dock-container.captured .dl-action-badge {
        background: rgba(52, 211, 153, 0.3) !important;
        border-color: rgba(52, 211, 153, 0.6) !important;
        color: #34d399 !important;
      }

      /* Quick Modal */
      .dl-modal {
        position: absolute !important;
        top: calc(100% + 8px) !important;
        right: 0 !important;
        width: 260px !important;
        padding: 12px !important;
        background: rgba(15, 23, 42, 0.95) !important;
        backdrop-filter: blur(32px) saturate(210%) !important;
        -webkit-backdrop-filter: blur(32px) saturate(210%) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 16px !important;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8),
                    0 0 24px rgba(56, 189, 248, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.18);
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translateY(-8px) scale(0.95) !important;
        transform-origin: top right !important;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
        pointer-events: none !important;
      }

      .dl-modal.open {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) scale(1) !important;
        pointer-events: auto !important;
      }

      .dl-modal-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding-bottom: 6px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      }

      .dl-modal-brand {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
      }

      .dl-modal-title {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        line-height: 1.2 !important;
      }

      .dl-modal-subtitle {
        font-size: 9.5px !important;
        color: #94a3b8 !important;
        font-weight: 500 !important;
      }

      .dl-modal-close {
        background: transparent !important;
        border: none !important;
        color: #94a3b8 !important;
        font-size: 18px !important;
        cursor: pointer !important;
        padding: 0 4px !important;
        line-height: 1 !important;
        transition: color 0.15s ease !important;
      }

      .dl-modal-close:hover {
        color: #ffffff !important;
      }

      .dl-modal-options {
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
      }

      .dl-opt-btn {
        display: flex !important;
        align-items: center !important;
        gap: 9px !important;
        padding: 7px 9px !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: all 0.15s ease !important;
      }

      .dl-opt-btn:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(56, 189, 248, 0.4) !important;
      }

      .dl-opt-btn.active {
        background: rgba(56, 189, 248, 0.18) !important;
        border-color: rgba(56, 189, 248, 0.65) !important;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.22) !important;
      }

      .dl-opt-icon {
        width: 22px !important;
        height: 22px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(0, 0, 0, 0.4) !important;
        border-radius: 6px !important;
        color: #38bdf8 !important;
        flex-shrink: 0 !important;
      }

      .dl-opt-btn.active .dl-opt-icon {
        color: #ffffff !important;
        background: rgba(56, 189, 248, 0.45) !important;
      }

      .dl-opt-info {
        display: flex !important;
        flex-direction: column !important;
      }

      .dl-opt-name {
        font-size: 11px !important;
        font-weight: 600 !important;
        color: #f1f5f9 !important;
        line-height: 1.2 !important;
      }

      .dl-opt-desc {
        font-size: 9.5px !important;
        color: #94a3b8 !important;
      }

      .dl-modal-submit {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 8px !important;
        background: linear-gradient(135deg, #0284c7, #2563eb) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 10px !important;
        color: #ffffff !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35) !important;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .dl-modal-submit:hover {
        background: linear-gradient(135deg, #0369a1, #1d4ed8) !important;
        box-shadow: 0 6px 18px rgba(2, 132, 199, 0.5) !important;
        transform: translateY(-1px) !important;
      }

      .dl-modal-submit:active {
        transform: scale(0.98) !important;
      }

      /* Cosmic Gravity Orb & Particle Effects */
      .dl-gravity-orb {
        position: fixed !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        background: radial-gradient(circle, #38bdf8 0%, #818cf8 60%, rgba(56, 189, 248, 0.8) 100%) !important;
        box-shadow: 0 0 20px 6px rgba(56, 189, 248, 0.9), 0 0 35px 12px rgba(129, 140, 248, 0.5) !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s ease-out !important;
      }

      .dl-stardust {
        position: fixed !important;
        width: 5px !important;
        height: 5px !important;
        border-radius: 50% !important;
        background: #38bdf8 !important;
        box-shadow: 0 0 10px #38bdf8 !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        opacity: 0.8;
        transition: opacity 0.6s ease-out, transform 0.6s ease-out !important;
      }

      /* Apple Dynamic Island HUD */
      .dl-dynamic-island {
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(-60px) scale(0.85) !important;
        background: rgba(15, 23, 42, 0.95) !important;
        backdrop-filter: blur(32px) saturate(210%) !important;
        -webkit-backdrop-filter: blur(32px) saturate(210%) !important;
        border: 1px solid rgba(56, 189, 248, 0.4) !important;
        border-radius: 9999px !important;
        padding: 8px 18px 8px 12px !important;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8),
                    0 0 30px rgba(56, 189, 248, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        pointer-events: auto !important;
        z-index: 2147483647 !important;
        opacity: 0;
        visibility: hidden;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, visibility 0.3s !important;
        overflow: hidden !important;
      }

      .dl-dynamic-island.active {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateX(-50%) translateY(0) scale(1) !important;
      }

      .dl-island-body {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .dl-island-leading {
        position: relative !important;
        width: 24px !important;
        height: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .dl-island-pulse {
        position: absolute !important;
        inset: -3px !important;
        border-radius: 8px !important;
        border: 1.5px solid rgba(56, 189, 248, 0.6) !important;
        animation: dl-island-spin 2s linear infinite !important;
      }

      @keyframes dl-island-spin {
        0% { transform: rotate(0deg); opacity: 0.8; }
        50% { transform: rotate(180deg); opacity: 0.3; }
        100% { transform: rotate(360deg); opacity: 0.8; }
      }

      .dl-island-content {
        display: flex !important;
        flex-direction: column !important;
      }

      .dl-island-title {
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
        letter-spacing: -0.2px !important;
        line-height: 1.2 !important;
      }

      .dl-island-subtitle {
        font-size: 10px !important;
        color: #94a3b8 !important;
        font-weight: 500 !important;
      }

      .dl-island-badge {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 4px 10px !important;
        background: rgba(16, 185, 129, 0.2) !important;
        border: 1px solid rgba(16, 185, 129, 0.4) !important;
        border-radius: 9999px !important;
        color: #34d399 !important;
        font-size: 10.5px !important;
        font-weight: 600 !important;
      }

      .dl-island-shimmer {
        position: absolute !important;
        top: 0 !important;
        left: -100% !important;
        width: 100% !important;
        height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent) !important;
        animation: dl-shimmer 2.5s infinite !important;
      }

      @keyframes dl-shimmer {
        0% { left: -100%; }
        100% { left: 200%; }
      }

      .dl-svg, .dl-zap, .dl-music, .dl-video, .dl-check {
        width: 13px !important;
        height: 13px !important;
      }
    `;

    shadowRoot.appendChild(styleEl);

    // Build the Dock DOM inside ShadowRoot using vector brand mark
    const container = document.createElement('div');
    container.className = 'dl-dock-container';
    container.innerHTML = `
      <div class="dl-pill" title="Capture media with Downlink Desktop">
        <div class="dl-brand">
          ${ICONS.downlinkLogo}
          <span class="dl-title">Downlink</span>
        </div>
        <div class="dl-action-badge">
          <span class="dl-action-text">Download</span>
          ${ICONS.chevron}
        </div>
      </div>

      <div class="dl-modal">
        <div class="dl-modal-header">
          <div class="dl-modal-brand">
            ${ICONS.downlinkLogo}
            <div>
              <div class="dl-modal-title">Downlink Companion</div>
              <div class="dl-modal-subtitle">Quick Capture</div>
            </div>
          </div>
          <button type="button" class="dl-modal-close" title="Close">&times;</button>
        </div>

        <div class="dl-modal-options">
          <button type="button" class="dl-opt-btn active" data-preset="recommended_best">
            <div class="dl-opt-icon">${ICONS.zap}</div>
            <div class="dl-opt-info">
              <span class="dl-opt-name">Best Quality</span>
              <span class="dl-opt-desc">Up to 4K / 8K resolution</span>
            </div>
          </button>

          <button type="button" class="dl-opt-btn" data-preset="video_1080p">
            <div class="dl-opt-icon">${ICONS.video}</div>
            <div class="dl-opt-info">
              <span class="dl-opt-name">1080p Full HD</span>
              <span class="dl-opt-desc">Crisp 1080p MP4 Video</span>
            </div>
          </button>

          <button type="button" class="dl-opt-btn" data-preset="audio_mp3">
            <div class="dl-opt-icon">${ICONS.music}</div>
            <div class="dl-opt-info">
              <span class="dl-opt-name">Audio Only (MP3)</span>
              <span class="dl-opt-desc">320kbps Audio Extraction</span>
            </div>
          </button>
        </div>

        <button type="button" class="dl-modal-submit">
          ${ICONS.downlink}
          <span>Send to Downlink</span>
        </button>
      </div>
    `;

    shadowRoot.appendChild(container);

    const pill = container.querySelector('.dl-pill');
    const modal = container.querySelector('.dl-modal');
    const closeBtn = container.querySelector('.dl-modal-close');
    const submitBtn = container.querySelector('.dl-modal-submit');
    const optBtns = container.querySelectorAll('.dl-opt-btn');
    const actionText = container.querySelector('.dl-action-text');

    // Dock Hover Listeners to keep dock open during interaction
    container.addEventListener('mouseenter', () => {
      isHoveringDock = true;
      if (autoHideTimer) clearTimeout(autoHideTimer);
      container.classList.add('dl-visible');
    });

    container.addEventListener('mouseleave', () => {
      isHoveringDock = false;
      if (!isOpen) {
        showDockTemporarily(2000);
      }
    });

    optBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        optBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPreset = btn.getAttribute('data-preset') || 'recommended_best';
      });
    });

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen = !isOpen;
      modal.classList.toggle('open', isOpen);
      if (isOpen) {
        container.classList.add('dl-visible');
        if (autoHideTimer) clearTimeout(autoHideTimer);
      } else {
        showDockTemporarily(2000);
      }
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen = false;
      modal.classList.remove('open');
      showDockTemporarily(1500);
    });

    submitBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const clickX = e.clientX || window.innerWidth / 2;
      const clickY = e.clientY || window.innerHeight / 2;

      // Trigger Cosmic Gravity Orb flight animation
      launchGravityOrb(clickX, clickY);

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Sending to Downlink...</span>`;
      actionText.textContent = 'Sending...';

      let targetUrl = window.location.href;
      try {
        if (window.self !== window.top && document.referrer) {
          targetUrl = document.referrer;
        }
      } catch (err) {}

      let streamUrl = undefined;
      if (activePlayerEl) {
        if (activePlayerEl instanceof HTMLVideoElement) {
          const src = activePlayerEl.currentSrc || activePlayerEl.src || '';
          // Strictly reject blob: and data: URLs (MSE internal memory streams)
          if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
            streamUrl = src;
          }
        } else if (activePlayerEl instanceof HTMLIFrameElement) {
          const src = activePlayerEl.src || '';
          if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
            streamUrl = src;
          }
        }
      }

      // Check if page is a major platform with dedicated extractors (YouTube, TikTok, Vimeo, etc.)
      const isMajorPlatform = /youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|tiktok\.com|twitter\.com|x\.com|instagram\.com|dailymotion\.com|bilibili\.com|soundcloud\.com/i.test(targetUrl);

      let effectiveUrl = targetUrl;
      if (isMajorPlatform) {
        effectiveUrl = targetUrl;
      } else if (streamUrl) {
        effectiveUrl = streamUrl;
      }

      // Canonicalize target URL (e.g. Dailymotion iframe -> clean video URL)
      const cleanTargetUrl = normalizeVideoUrl(effectiveUrl);

      chrome.runtime.sendMessage(
        {
          type: 'CAPTURE_URL',
          url: cleanTargetUrl,
          options: {
            title: document.title || 'Web Media',
            referer: targetUrl,
            streamUrl: streamUrl || undefined,
            presetId: selectedPreset,
            autoStart: true
          }
        },
        (res) => {
          submitBtn.disabled = false;
          if (res && res.success) {
            isOpen = false;
            modal.classList.remove('open');
            container.classList.add('captured');
            actionText.textContent = 'Queued';

            // Show Apple Dynamic Island HUD in browser!
            showDynamicIslandHUD(
              document.title ? `Captured: ${document.title.slice(0, 32)}...` : 'Queued in Downlink',
              'Downloading in Downlink Desktop'
            );

            setTimeout(() => {
              container.classList.remove('captured');
              actionText.textContent = 'Download';
              showDockTemporarily(2000);
            }, 3500);
          } else {
            actionText.textContent = 'App Offline';
            submitBtn.innerHTML = `${ICONS.downlink}<span>Downlink App Offline</span>`;
            setTimeout(() => {
              actionText.textContent = 'Download';
              submitBtn.innerHTML = `${ICONS.downlink}<span>Send to Downlink</span>`;
              showDockTemporarily(2000);
            }, 2500);
          }
        }
      );
    });

    // Close on outer click
    document.addEventListener('click', (e) => {
      if (isOpen && !dockHost.contains(e.target)) {
        isOpen = false;
        modal.classList.remove('open');
        showDockTemporarily(1500);
      }
    });

    (document.body || document.documentElement).appendChild(dockHost);

    // Initial greeting reveal: show for 4 seconds then stealth auto-hide
    showDockTemporarily(4000);

    return shadowRoot;
  }

  /**
   * Updates coordinates dynamically to pin to the player wrapper or viewport
   */
  function updatePosition() {
    if (!shadowRoot) return;
    const container = shadowRoot.querySelector('.dl-dock-container');
    if (!container) return;

    if (activePlayerEl) {
      const rect = activePlayerEl.getBoundingClientRect();
      if (rect.width >= 120 && rect.height >= 80 && rect.bottom > 60 && rect.top < window.innerHeight - 40) {
        const top = Math.max(16, rect.top + 16);
        const right = Math.max(16, (window.innerWidth - rect.right) + 16);
        container.style.top = `${top}px`;
        container.style.right = `${right}px`;
        return;
      }
    }

    // Default viewport top-right dock
    container.style.top = '20px';
    container.style.right = '20px';
  }

  /**
   * Discovers video players and attaches hover / proximity event triggers
   */
  function scanForPlayers() {
    initDock();

    // 1. Direct <video> elements
    const videos = Array.from(document.querySelectorAll('video')).filter(
      (v) => v.offsetWidth >= 100 || v.offsetHeight >= 80 || v.duration > 0 || v.src || v.currentSrc
    );

    // 2. Video Player <iframe> elements
    const iframes = Array.from(document.querySelectorAll('iframe')).filter((iframe) => {
      const src = (iframe.src || iframe.getAttribute('data-src') || '').toLowerCase();
      const rect = iframe.getBoundingClientRect();
      return (
        src.includes('dailymotion') ||
        src.includes('embed') ||
        src.includes('player') ||
        src.includes('stream') ||
        src.includes('video') ||
        src.includes('donghua') ||
        src.includes('youtube') ||
        src.includes('vimeo') ||
        src.includes('mp4') ||
        (rect.width >= 200 && rect.height >= 120)
      );
    });

    // 3. Dedicated player wrappers (e.g. .player, #player, .player-holder)
    const wrappers = Array.from(
      document.querySelectorAll('#player, .player, .player-holder, .player-embed, .responsive-embed, .jwplayer, .video-js, .plyr, #playeroptions')
    ).filter((w) => w.offsetWidth >= 180 && w.offsetHeight >= 100);

    const candidates = [...videos, ...iframes, ...wrappers];

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        return (rB.width * rB.height) - (rA.width * rA.height);
      });

      const primary = candidates[0];
      if (primary !== activePlayerEl) {
        activePlayerEl = primary;

        // Attach hover listener to player wrapper to wake dock
        activePlayerEl.addEventListener('mouseenter', () => showDockTemporarily(3500), { passive: true });
        activePlayerEl.addEventListener('mousemove', () => showDockTemporarily(3000), { passive: true });
      }
    }

    updatePosition();
  }

  // Global mouse movement proximity watcher (shows pill if cursor is near top-right of player or viewport)
  window.addEventListener(
    'mousemove',
    (e) => {
      if (activePlayerEl) {
        const rect = activePlayerEl.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          showDockTemporarily(3000);
          return;
        }
      }

      // If mouse is within 140px of top-right screen corner
      if (e.clientX >= window.innerWidth - 160 && e.clientY <= 120) {
        showDockTemporarily(3000);
      }
    },
    { passive: true }
  );

  // Update position on scroll, resize, or playback
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });

  ['play', 'playing', 'pause', 'loadeddata', 'canplay', 'timeupdate'].forEach((evt) => {
    window.addEventListener(
      evt,
      (e) => {
        if (e.target instanceof HTMLVideoElement) {
          activePlayerEl = e.target;
          updatePosition();
          if (evt === 'pause') {
            showDockTemporarily(3500);
          }
        }
      },
      true
    );
  });

  // Start continuous scanner
  function start() {
    initDock();
    scanForPlayers();

    const observer = new MutationObserver(() => {
      scanForPlayers();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    setInterval(scanForPlayers, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
