import { Downloader } from '@downloader/core';
import { ConfigManager } from '@config/manager';

// Mock the config manager to avoid missing DOJ_COOKIES error
jest.mock('@config/manager', () => {
  return {
    ConfigManager: jest.fn().mockImplementation(() => {
      return {
        getString: jest.fn().mockReturnValue('test-value'),
        getNumber: jest.fn().mockReturnValue(4),
        getBoolean: jest.fn().mockReturnValue(true),
        validate: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Downloader', () => {
  let downloader: Downloader;
  let configManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    configManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    downloader = new Downloader();
  });

  test('should create downloader instance', () => {
    expect(downloader).toBeInstanceOf(Downloader);
  });

  test('should initialize without error', async () => {
    await expect(downloader.initialize()).resolves.not.toThrow();
  });

  test('should add download to queue', async () => {
    await downloader.initialize();
    await downloader.addDownload('http://example.com/file.pdf', 'file.pdf');
    const stats = await downloader.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
  });
});