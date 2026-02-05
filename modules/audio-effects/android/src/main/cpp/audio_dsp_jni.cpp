#include <jni.h>
#include <android/log.h>
#include "simd_processor.h"

#define LOG_TAG "AudioDSP"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, LOG_TAG, __VA_ARGS__)

using namespace audio_dsp;

extern "C" {

JNIEXPORT jboolean JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_isNEONAvailable(JNIEnv* env, jobject thiz) {
    return SIMDProcessor::isNEONAvailable() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_applyGainNative(
    JNIEnv* env, jobject thiz,
    jfloatArray samples,
    jfloat gain
) {
    jfloat* samplePtr = env->GetFloatArrayElements(samples, nullptr);
    jsize length = env->GetArrayLength(samples);
    
    SIMDProcessor::applyGainNEON(samplePtr, static_cast<size_t>(length), gain);
    
    env->ReleaseFloatArrayElements(samples, samplePtr, 0);
}

JNIEXPORT void JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_biquadFilterNative(
    JNIEnv* env, jobject thiz,
    jfloatArray samples,
    jint channelCount,
    jfloat b0, jfloat b1, jfloat b2,
    jfloat a1, jfloat a2,
    jfloatArray stateL,
    jfloatArray stateR
) {
    jfloat* samplePtr = env->GetFloatArrayElements(samples, nullptr);
    jsize length = env->GetArrayLength(samples);
    
    jfloat* stateLeftPtr = env->GetFloatArrayElements(stateL, nullptr);
    jfloat* stateRightPtr = env->GetFloatArrayElements(stateR, nullptr);
    
    SIMDProcessor::biquadFilterNEON(
        samplePtr,
        static_cast<size_t>(length),
        channelCount,
        b0, b1, b2, a1, a2,
        stateLeftPtr[0], stateLeftPtr[1], stateLeftPtr[2], stateLeftPtr[3],
        stateRightPtr[0], stateRightPtr[1], stateRightPtr[2], stateRightPtr[3]
    );
    
    env->ReleaseFloatArrayElements(samples, samplePtr, 0);
    env->ReleaseFloatArrayElements(stateL, stateLeftPtr, 0);
    env->ReleaseFloatArrayElements(stateR, stateRightPtr, 0);
}

JNIEXPORT void JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_softClipNative(
    JNIEnv* env, jobject thiz,
    jfloatArray samples
) {
    jfloat* samplePtr = env->GetFloatArrayElements(samples, nullptr);
    jsize length = env->GetArrayLength(samples);
    
    SIMDProcessor::softClipNEON(samplePtr, static_cast<size_t>(length));
    
    env->ReleaseFloatArrayElements(samples, samplePtr, 0);
}

JNIEXPORT void JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_pcm16ToFloatNative(
    JNIEnv* env, jobject thiz,
    jshortArray input,
    jfloatArray output
) {
    jshort* inputPtr = env->GetShortArrayElements(input, nullptr);
    jfloat* outputPtr = env->GetFloatArrayElements(output, nullptr);
    jsize length = env->GetArrayLength(input);
    
    SIMDProcessor::pcm16ToFloatNEON(
        inputPtr,
        outputPtr,
        static_cast<size_t>(length)
    );
    
    env->ReleaseShortArrayElements(input, inputPtr, JNI_ABORT);
    env->ReleaseFloatArrayElements(output, outputPtr, 0);
}

JNIEXPORT void JNICALL
Java_expo_modules_audioeffects_NativeDSPModule_floatToPcm16Native(
    JNIEnv* env, jobject thiz,
    jfloatArray input,
    jshortArray output
) {
    jfloat* inputPtr = env->GetFloatArrayElements(input, nullptr);
    jshort* outputPtr = env->GetShortArrayElements(output, nullptr);
    jsize length = env->GetArrayLength(input);
    
    SIMDProcessor::floatToPcm16NEON(
        inputPtr,
        outputPtr,
        static_cast<size_t>(length)
    );
    
    env->ReleaseFloatArrayElements(input, inputPtr, JNI_ABORT);
    env->ReleaseShortArrayElements(output, outputPtr, 0);
}

}
