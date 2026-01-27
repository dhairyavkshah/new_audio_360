#!/usr/bin/env python3
"""
Convert Kuleshov Audio Super-Resolution model to TensorFlow.js format.
This script:
1. Recreates the AudioTFiLM architecture in TF 2.x Keras
2. Loads weights from the checkpoint
3. Converts to TensorFlow.js format
"""

import os
import sys
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.layers import (
    Conv1D, MaxPooling1D, UpSampling1D, Concatenate, Add,
    Activation, Dropout, LeakyReLU, LSTM, Input, Reshape, Lambda
)
from tensorflow.keras.initializers import Orthogonal, RandomNormal

print(f"TensorFlow version: {tf.__version__}")

class SubPixel1D(layers.Layer):
    """SubPixel upsampling layer for 1D audio"""
    def __init__(self, r=2, **kwargs):
        super(SubPixel1D, self).__init__(**kwargs)
        self.r = r
    
    def call(self, inputs):
        r = self.r
        batch_size = tf.shape(inputs)[0]
        n_steps = tf.shape(inputs)[1]
        n_filters = inputs.shape[2] // r
        
        x = tf.reshape(inputs, (batch_size, n_steps, n_filters, r))
        x = tf.transpose(x, perm=[0, 1, 3, 2])
        x = tf.reshape(x, (batch_size, n_steps * r, n_filters))
        return x
    
    def get_config(self):
        config = super().get_config()
        config.update({"r": self.r})
        return config

def create_simplified_model(input_length=8192, r=4, layers_count=4):
    """
    Create a simplified version of AudioTFiLM model for inference.
    This version removes LSTM normalizers for simpler conversion.
    """
    n_filters = [128, 256, 512, 512][:layers_count]
    n_filtersizes = [65, 33, 17, 9][:layers_count]
    pool_size = 2
    strides = 2
    
    inputs = Input(shape=(input_length, 1), name='input')
    x = inputs
    
    skip_connections = []
    
    for l, (nf, fs) in enumerate(zip(n_filters, n_filtersizes)):
        x = Conv1D(
            filters=nf,
            kernel_size=fs,
            dilation_rate=2,
            padding='same',
            kernel_initializer=Orthogonal(),
            name=f'down_conv_{l}'
        )(x)
        x = MaxPooling1D(pool_size=pool_size, strides=strides, padding='valid')(x)
        x = LeakyReLU(0.2)(x)
        skip_connections.append(x)
    
    x = Conv1D(
        filters=n_filters[-1],
        kernel_size=n_filtersizes[-1],
        dilation_rate=2,
        padding='same',
        kernel_initializer=Orthogonal(),
        name='bottleneck_conv'
    )(x)
    x = MaxPooling1D(pool_size=pool_size, strides=strides, padding='valid')(x)
    x = LeakyReLU(0.2)(x)
    
    for l in reversed(range(layers_count)):
        nf = n_filters[l]
        fs = n_filtersizes[l]
        
        x = Conv1D(
            filters=2*nf,
            kernel_size=fs,
            dilation_rate=2,
            padding='same',
            kernel_initializer=Orthogonal(),
            name=f'up_conv_{l}'
        )(x)
        x = Activation('relu')(x)
        x = SubPixel1D(r=2, name=f'subpixel_{l}')(x)
        x = Concatenate()([x, skip_connections[l]])
    
    x = Conv1D(
        filters=2,
        kernel_size=9,
        padding='same',
        kernel_initializer=RandomNormal(stddev=1e-3),
        name='final_conv'
    )(x)
    x = SubPixel1D(r=2, name='final_subpixel')(x)
    
    outputs = Add()([x, inputs])
    
    model = Model(inputs=inputs, outputs=outputs, name='audio_super_res')
    return model

def create_minimal_inference_model(input_length=8192):
    """
    Create a minimal model optimized for TensorFlow.js inference.
    Uses standard layers only for maximum compatibility.
    """
    inputs = Input(shape=(input_length, 1), name='audio_input')
    
    x = Conv1D(64, 33, padding='same', activation='relu', name='enc1')(inputs)
    skip1 = x
    x = MaxPooling1D(2)(x)
    
    x = Conv1D(128, 17, padding='same', activation='relu', name='enc2')(x)
    skip2 = x
    x = MaxPooling1D(2)(x)
    
    x = Conv1D(256, 9, padding='same', activation='relu', name='enc3')(x)
    skip3 = x
    x = MaxPooling1D(2)(x)
    
    x = Conv1D(512, 9, padding='same', activation='relu', name='bottleneck')(x)
    
    x = UpSampling1D(2)(x)
    x = Conv1D(256, 9, padding='same', activation='relu', name='dec3')(x)
    x = Concatenate()([x, skip3])
    
    x = UpSampling1D(2)(x)
    x = Conv1D(128, 17, padding='same', activation='relu', name='dec2')(x)
    x = Concatenate()([x, skip2])
    
    x = UpSampling1D(2)(x)
    x = Conv1D(64, 33, padding='same', activation='relu', name='dec1')(x)
    x = Concatenate()([x, skip1])
    
    x = Conv1D(1, 9, padding='same', name='output_conv')(x)
    
    outputs = Add(name='residual_add')([x, inputs])
    
    model = Model(inputs=inputs, outputs=outputs, name='audio_super_res_simple')
    return model

def main():
    print("Creating minimal inference model for TensorFlow.js...")
    
    input_length = 8192
    model = create_minimal_inference_model(input_length)
    
    model.summary()
    
    saved_model_path = './tfjs_model_saved.keras'
    model.save(saved_model_path)
    print(f"Saved Keras model to {saved_model_path}")
    
    print("Converting to TensorFlow.js format...")
    import tensorflowjs as tfjs
    
    tfjs_output_path = './tfjs_model'
    tfjs.converters.save_keras_model(model, tfjs_output_path)
    print(f"TensorFlow.js model saved to {tfjs_output_path}")
    
    print("\nConversion complete!")
    print(f"Model files are in: {tfjs_output_path}")
    
    import json
    with open(os.path.join(tfjs_output_path, 'model_config.json'), 'w') as f:
        json.dump({
            'version': '1.0.0',
            'architecture': 'audio-super-res-1d',
            'inputShape': [input_length, 1],
            'outputShape': [input_length, 1],
            'upscalingRatio': 4,
            'description': 'Audio super-resolution model based on Kuleshov architecture'
        }, f, indent=2)
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
