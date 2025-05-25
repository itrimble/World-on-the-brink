```typescript
// src/main/ipc/systemHandlers.ts
import { app, ipcMain, screen } from 'electron';
import os from 'os';
import { execSync } from 'child_process';

export const setupSystemHandlers = () => {
  // Get system information
  ipcMain.handle('get-system-info', async () => {
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      
      // Determine GPU info
      let gpuInfo = 'Unknown';
      try {
        if (process.platform === 'win32') {
          const output = execSync('wmic path win32_VideoController get name').toString();
          const lines = output.split('\n').filter(line => line.trim() !== '' && line.trim() !== 'Name');
          if (lines.length > 0) {
            gpuInfo = lines[0].trim();
          }
        } else if (process.platform === 'darwin') {
          const output = execSync('system_profiler SPDisplaysDataType | grep "Chipset Model:"').toString();
          const match = output.match(/Chipset Model: (.+)/);
          if (match && match[1]) {
            gpuInfo = match[1].trim();
          }
        } else if (process.platform === 'linux') {
          const output = execSync('lspci | grep -i vga').toString();
          if (output.trim()) {
            gpuInfo = output.trim().split(':').slice(2).join(':').trim();
          }
        }
      } catch (error) {
        console.error('Error getting GPU info:', error);
      }
      
      // Get memory info
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      
      // Gather system info
      const systemInfo = {
        app: {
          version: app.getVersion(),
          name: app.getName(),
          locale: app.getLocale(),
        },
        os: {
          platform: process.platform,
          release: os.release(),
          version: os.version(),
          arch: process.arch,
        },
        hardware: {
          cpuModel: os.cpus()[0]?.model || 'Unknown',
          cpuCores: os.cpus().length,
          totalMemory,
          freeMemory,
          usedMemory: totalMemory - freeMemory,
          gpuInfo,
        },
        display: {
          width: primaryDisplay.workAreaSize.width,
          height: primaryDisplay.workAreaSize.height,
          scaleFactor: primaryDisplay.scaleFactor,
          colorDepth: primaryDisplay.colorDepth,
          isRetina: primaryDisplay.scaleFactor > 1,
          multipleMonitors: displays.length > 1,
        },
      };
      
      return { success: true, systemInfo };
    } catch (error) {
      console.error('Error getting system info:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Check if controller is connected
  ipcMain.handle('check-controller', async () => {
    try {
      // This is just a placeholder since Electron doesn't have native gamepad detection
      // In a real implementation, we would need to use the Web Gamepad API in the renderer
      return { 
        success: true, 
        message: 'Controller detection is handled in the renderer process via the Web Gamepad API.' 
      };
    } catch (error) {
      console.error('Error checking controller:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get app path (useful for finding assets)
  ipcMain.handle('get-app-path', async (_, pathName: string) => {
    try {
      const validPaths = ['home', 'appData', 'userData', 'temp', 'exe', 'module', 'desktop', 'documents', 'downloads', 'music', 'pictures', 'videos'];
      
      if (!validPaths.includes(pathName)) {
        return { success: false, error: `Invalid path name. Valid options are: ${validPaths.join(', ')}` };
      }
      
      // @ts-ignore - TypeScript doesn't recognize all the valid paths
      const requestedPath = app.getPath(pathName);
      
      return { success: true, path: requestedPath };
    } catch (error) {
      console.error(`Error getting app path ${pathName}:`, error);
      return { success: false, error: (error as Error).message };
    }
  });
};
```