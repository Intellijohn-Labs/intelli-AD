/**
 * Bump when the in-browser greeting-video encoder changes in a way WhatsApp cares about. The studio sends it with every video pre-flight and the server
 * refuses older values, so a browser tab left open from before a deploy (it keeps running its old JavaScript until reloaded) can't upload old-format videos.
 * 1 = MediaRecorder (fragmented MP4), 2 = WebCodecs + mp4-muxer, 3 = adds multiple-of-16 dimensions and the 2.4 Mbps cap.
 */
export const VIDEO_RENDERER_VERSION = 3;
