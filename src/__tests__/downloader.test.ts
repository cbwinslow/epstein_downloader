import { Downloader } from '../downloader/core';

describe('Downloader', () => {
  let downloader: Downloader;

  beforeEach(() => {
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