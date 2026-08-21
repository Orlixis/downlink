"use client";

import type { AppUpdateInfo } from "@/app/types";
import { AppUpdater } from "../../AppUpdater";

interface UpdatesTabProps {
  currentVersion: string | null;
  checkAppUpdate: () => Promise<AppUpdateInfo>;
  installAppUpdate: () => Promise<void>;
  restartApp: () => Promise<void>;
}

export function UpdatesTab({
  currentVersion,
  checkAppUpdate,
  installAppUpdate,
  restartApp,
}: UpdatesTabProps) {
  return (
    <div className="space-y-4">
      <AppUpdater
        currentVersion={currentVersion}
        checkAppUpdate={checkAppUpdate}
        installAppUpdate={installAppUpdate}
        restartApp={restartApp}
      />
    </div>
  );
}
