#ifndef SIMD_PROCESSOR_H
#define SIMD_PROCESSOR_H

#include <cstdint>
#include <cstddef>

#if defined(__ARM_NEON) || defined(__ARM_NEON__)
#define USE_NEON 1
#include <arm_neon.h>
#endif

namespace audio_dsp {

class SIMDProcessor {
public:
    static void biquadFilterNEON(
        float* samples,
        size_t sampleCount,
        int channelCount,
        float b0, float b1, float b2,
        float a1, float a2,
        float& x1L, float& x2L, float& y1L, float& y2L,
        float& x1R, float& x2R, float& y1R, float& y2R
    );

    static void applyGainNEON(float* samples, size_t sampleCount, float gain);

    static void mixStereoNEON(
        float* left, float* right,
        float* mid, float* side,
        size_t sampleCount
    );

    static void softClipNEON(float* samples, size_t sampleCount);

    static void pcm16ToFloatNEON(const int16_t* input, float* output, size_t sampleCount);

    static void floatToPcm16NEON(const float* input, int16_t* output, size_t sampleCount);

    static bool isNEONAvailable();

private:
    SIMDProcessor() = delete;
};

}

#endif
