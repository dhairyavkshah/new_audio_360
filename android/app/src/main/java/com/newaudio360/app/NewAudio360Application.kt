package com.newaudio360.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class NewAudio360Application : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
