import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

const APP_ID = 'c309f46a6f23498a8f8bec6dd3f17fb8';

export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: ILocalAudioTrack | null = null;

  // 1. Khởi tạo client Agora
  public initClient(): IAgoraRTCClient {
    if (!this.client) {
      this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    }
    return this.client;
  }

  // 2. Tham gia phòng (join room)
  public async joinRoom(channelName: string, token: string | null, uid: string | number | null = null): Promise<void> {
    try {
      const client = this.initClient();

      // Nếu client đã kết nối hoặc đang kết nối, rời phòng trước để tránh lỗi
      if (client.connectionState !== 'DISCONNECTED') {
        await this.leaveRoom();
      }

      // Tham gia vào channel Agora
      await client.join(APP_ID, channelName, token, uid);
      console.log('Đã tham gia phòng thành công:', channelName);

      // Tạo track micro thu âm từ thiết bị phần cứng
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,  // Echo cancellation
        ANS: true,  // Noise suppression
        AGC: true,  // Auto gain control
      });

      // Xuất bản (Publish) luồng âm thanh micro lên phòng
      await client.publish(this.localAudioTrack);
      console.log('Đã bật và đẩy micro lên phòng thành công!');

      // Lắng nghe người dùng khác phát âm thanh
      client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (mediaType === 'audio') {
          await client.subscribe(user, mediaType);
          user.audioTrack?.play();
          console.log('Đã đăng ký và phát âm thanh từ user:', user.uid);
        }
      });

      client.on('user-unpublished', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
        if (mediaType === 'audio') {
          await client.unsubscribe(user, mediaType);
          console.log('User đã dừng phát âm thanh:', user.uid);
        }
      });
    } catch (error) {
      console.error('Lỗi khi tham gia phòng Agora:', error);
      throw error;
    }
  }

  // 3. Bật/Tắt Micro (Mute/Unmute)
  public async toggleMicrophone(mute: boolean): Promise<void> {
    if (!this.localAudioTrack) {
      console.warn('Không tìm thấy track micro để bật/tắt.');
      return;
    }
    try {
      await this.localAudioTrack.setEnabled(!mute);
      console.log(mute ? 'Đã tắt micro (Muted)' : 'Đã bật micro (Unmuted)');
    } catch (error) {
      console.error('Lỗi bật/tắt micro:', error);
      throw error;
    }
  }

  // 4. Rời phòng và giải phóng Micro
  public async leaveRoom(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();   // Dừng thu âm vật lý
        this.localAudioTrack.close();  // Giải phóng phần cứng micro
        this.localAudioTrack = null;
      }
      if (this.client) {
        if (this.client.connectionState !== 'DISCONNECTED') {
          await this.client.leave();
          console.log('Đã rời phòng Agora và đóng kết nối.');
        }
      }
    } catch (error) {
      console.error('Lỗi khi rời phòng Agora:', error);
      throw error;
    }
  }

  // Lấy client hiện tại
  public getClient(): IAgoraRTCClient | null {
    return this.client;
  }

  // Lấy track micro hiện tại
  public getLocalAudioTrack(): ILocalAudioTrack | null {
    return this.localAudioTrack;
  }
}

export const agoraService = new AgoraService();
