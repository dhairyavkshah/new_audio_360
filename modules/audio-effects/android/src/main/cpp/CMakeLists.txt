cmake_minimum_required(VERSION 3.18.0)
project(audio_dsp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(audio_dsp SHARED
    audio_dsp_jni.cpp
    simd_processor.cpp
)

target_compile_options(audio_dsp PRIVATE
    -O3
    -ffast-math
    -funroll-loops
    $<$<STREQUAL:${CMAKE_ANDROID_ARCH_ABI},arm64-v8a>:-march=armv8-a+simd>
    $<$<STREQUAL:${CMAKE_ANDROID_ARCH_ABI},armeabi-v7a>:-mfpu=neon>
)

target_include_directories(audio_dsp PRIVATE
    ${CMAKE_SOURCE_DIR}
)

find_library(log-lib log)
find_library(android-lib android)

target_link_options(audio_dsp PRIVATE
    -Wl,-z,max-page-size=16384
    -Wl,-z,common-page-size=16384
)

target_link_libraries(audio_dsp
    ${log-lib}
    ${android-lib}
)
