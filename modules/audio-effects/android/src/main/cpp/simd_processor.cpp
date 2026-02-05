#include "simd_processor.h"
#include <algorithm>
#include <cmath>

namespace audio_dsp {

bool SIMDProcessor::isNEONAvailable() {
#ifdef USE_NEON
    return true;
#else
    return false;
#endif
}

void SIMDProcessor::biquadFilterNEON(
    float* samples,
    size_t sampleCount,
    int channelCount,
    float b0, float b1, float b2,
    float a1, float a2,
    float& x1L, float& x2L, float& y1L, float& y2L,
    float& x1R, float& x2R, float& y1R, float& y2R
) {
    if (channelCount != 2) return;
    
    size_t frameCount = sampleCount / 2;
    
    for (size_t i = 0; i < frameCount; i++) {
        size_t idx = i * 2;
        
        float inL = samples[idx];
        float inR = samples[idx + 1];
        
        float outL = b0 * inL + b1 * x1L + b2 * x2L - a1 * y1L - a2 * y2L;
        x2L = x1L; x1L = inL;
        y2L = y1L; y1L = outL;
        
        float outR = b0 * inR + b1 * x1R + b2 * x2R - a1 * y1R - a2 * y2R;
        x2R = x1R; x1R = inR;
        y2R = y1R; y1R = outR;
        
        samples[idx] = outL;
        samples[idx + 1] = outR;
    }
}

void SIMDProcessor::applyGainNEON(float* samples, size_t sampleCount, float gain) {
#ifdef USE_NEON
    float32x4_t gainVec = vdupq_n_f32(gain);
    size_t i = 0;
    
    for (; i + 4 <= sampleCount; i += 4) {
        float32x4_t sampleVec = vld1q_f32(&samples[i]);
        sampleVec = vmulq_f32(sampleVec, gainVec);
        vst1q_f32(&samples[i], sampleVec);
    }
    
    for (; i < sampleCount; i++) {
        samples[i] *= gain;
    }
#else
    for (size_t i = 0; i < sampleCount; i++) {
        samples[i] *= gain;
    }
#endif
}

void SIMDProcessor::mixStereoNEON(
    float* left, float* right,
    float* mid, float* side,
    size_t sampleCount
) {
#ifdef USE_NEON
    float32x4_t half = vdupq_n_f32(0.5f);
    size_t i = 0;
    
    for (; i + 4 <= sampleCount; i += 4) {
        float32x4_t l = vld1q_f32(&left[i]);
        float32x4_t r = vld1q_f32(&right[i]);
        
        float32x4_t m = vmulq_f32(vaddq_f32(l, r), half);
        float32x4_t s = vmulq_f32(vsubq_f32(l, r), half);
        
        vst1q_f32(&mid[i], m);
        vst1q_f32(&side[i], s);
    }
    
    for (; i < sampleCount; i++) {
        mid[i] = (left[i] + right[i]) * 0.5f;
        side[i] = (left[i] - right[i]) * 0.5f;
    }
#else
    for (size_t i = 0; i < sampleCount; i++) {
        mid[i] = (left[i] + right[i]) * 0.5f;
        side[i] = (left[i] - right[i]) * 0.5f;
    }
#endif
}

void SIMDProcessor::softClipNEON(float* samples, size_t sampleCount) {
#ifdef USE_NEON
    float32x4_t one = vdupq_n_f32(1.0f);
    float32x4_t neg_one = vdupq_n_f32(-1.0f);
    size_t i = 0;
    
    for (; i + 4 <= sampleCount; i += 4) {
        float32x4_t v = vld1q_f32(&samples[i]);
        v = vminq_f32(v, one);
        v = vmaxq_f32(v, neg_one);
        vst1q_f32(&samples[i], v);
    }
    
    for (; i < sampleCount; i++) {
        samples[i] = std::min(1.0f, std::max(-1.0f, samples[i]));
    }
#else
    for (size_t i = 0; i < sampleCount; i++) {
        samples[i] = std::min(1.0f, std::max(-1.0f, samples[i]));
    }
#endif
}

void SIMDProcessor::pcm16ToFloatNEON(const int16_t* input, float* output, size_t sampleCount) {
#ifdef USE_NEON
    float32x4_t scale = vdupq_n_f32(1.0f / 32768.0f);
    size_t i = 0;
    
    for (; i + 4 <= sampleCount; i += 4) {
        int16x4_t in = vld1_s16(&input[i]);
        int32x4_t i32 = vmovl_s16(in);
        float32x4_t f32 = vcvtq_f32_s32(i32);
        f32 = vmulq_f32(f32, scale);
        vst1q_f32(&output[i], f32);
    }
    
    for (; i < sampleCount; i++) {
        output[i] = input[i] / 32768.0f;
    }
#else
    for (size_t i = 0; i < sampleCount; i++) {
        output[i] = input[i] / 32768.0f;
    }
#endif
}

void SIMDProcessor::floatToPcm16NEON(const float* input, int16_t* output, size_t sampleCount) {
#ifdef USE_NEON
    float32x4_t scale = vdupq_n_f32(32767.0f);
    float32x4_t one = vdupq_n_f32(1.0f);
    float32x4_t neg_one = vdupq_n_f32(-1.0f);
    size_t i = 0;
    
    for (; i + 4 <= sampleCount; i += 4) {
        float32x4_t f32 = vld1q_f32(&input[i]);
        f32 = vminq_f32(f32, one);
        f32 = vmaxq_f32(f32, neg_one);
        f32 = vmulq_f32(f32, scale);
        int32x4_t i32 = vcvtq_s32_f32(f32);
        int16x4_t i16 = vqmovn_s32(i32);
        vst1_s16(&output[i], i16);
    }
    
    for (; i < sampleCount; i++) {
        float clamped = std::min(1.0f, std::max(-1.0f, input[i]));
        output[i] = static_cast<int16_t>(clamped * 32767.0f);
    }
#else
    for (size_t i = 0; i < sampleCount; i++) {
        float clamped = std::min(1.0f, std::max(-1.0f, input[i]));
        output[i] = static_cast<int16_t>(clamped * 32767.0f);
    }
#endif
}

}
