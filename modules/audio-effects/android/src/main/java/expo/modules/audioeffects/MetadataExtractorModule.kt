package expo.modules.audioeffects

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.net.URLDecoder

class MetadataExtractorModule : Module() {
    
    private fun decodeFilePath(uri: String): String {
        val path = if (uri.startsWith("file://")) {
            uri.substring(7)
        } else {
            uri
        }
        return try {
            URLDecoder.decode(path, "UTF-8")
        } catch (e: Exception) {
            path
        }
    }
    
    override fun definition() = ModuleDefinition {
        Name("MetadataExtractorModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("extractMetadata") { uri: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to "Context not available"
                    ))
                    return@AsyncFunction
                }
                
                val retriever = MediaMetadataRetriever()
                
                try {
                    if (uri.startsWith("content://")) {
                        retriever.setDataSource(context, Uri.parse(uri))
                    } else {
                        val filePath = decodeFilePath(uri)
                        retriever.setDataSource(filePath)
                    }
                    
                    val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
                    val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
                        ?: retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST)
                    val album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
                    val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    val year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
                    val genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
                    val trackNumber = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER)
                    
                    var albumArtBase64: String? = null
                    try {
                        val embeddedPicture = retriever.embeddedPicture
                        if (embeddedPicture != null && embeddedPicture.isNotEmpty()) {
                            val options = BitmapFactory.Options().apply {
                                inJustDecodeBounds = true
                            }
                            BitmapFactory.decodeByteArray(embeddedPicture, 0, embeddedPicture.size, options)
                            
                            val maxSize = 400
                            var sampleSize = 1
                            if (options.outWidth > maxSize || options.outHeight > maxSize) {
                                val widthRatio = options.outWidth / maxSize
                                val heightRatio = options.outHeight / maxSize
                                sampleSize = maxOf(widthRatio, heightRatio)
                            }
                            
                            val decodeOptions = BitmapFactory.Options().apply {
                                inSampleSize = sampleSize
                            }
                            val bitmap = BitmapFactory.decodeByteArray(embeddedPicture, 0, embeddedPicture.size, decodeOptions)
                            
                            if (bitmap != null) {
                                val outputStream = ByteArrayOutputStream()
                                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                                val compressedBytes = outputStream.toByteArray()
                                albumArtBase64 = Base64.encodeToString(compressedBytes, Base64.NO_WRAP)
                                bitmap.recycle()
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("MetadataExtractor", "Failed to extract album art: ${e.message}")
                    }
                    
                    retriever.release()
                    
                    promise.resolve(mapOf(
                        "success" to true,
                        "title" to title,
                        "artist" to artist,
                        "album" to album,
                        "duration" to duration?.toLongOrNull(),
                        "year" to year,
                        "genre" to genre,
                        "trackNumber" to trackNumber,
                        "albumArt" to albumArtBase64
                    ))
                } catch (e: Exception) {
                    try { retriever.release() } catch (_: Exception) {}
                    android.util.Log.e("MetadataExtractor", "Error extracting metadata: ${e.message}")
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to (e.message ?: "Unknown error")
                    ))
                }
            } catch (e: Exception) {
                android.util.Log.e("MetadataExtractor", "Outer error: ${e.message}")
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to (e.message ?: "Unknown error")
                ))
            }
        }
        
        AsyncFunction("extractAlbumArt") { uri: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to "Context not available"
                    ))
                    return@AsyncFunction
                }
                
                val retriever = MediaMetadataRetriever()
                
                try {
                    if (uri.startsWith("content://")) {
                        retriever.setDataSource(context, Uri.parse(uri))
                    } else {
                        val filePath = decodeFilePath(uri)
                        retriever.setDataSource(filePath)
                    }
                    
                    val embeddedPicture = retriever.embeddedPicture
                    retriever.release()
                    
                    if (embeddedPicture != null && embeddedPicture.isNotEmpty()) {
                        val options = BitmapFactory.Options().apply {
                            inJustDecodeBounds = true
                        }
                        BitmapFactory.decodeByteArray(embeddedPicture, 0, embeddedPicture.size, options)
                        
                        val maxSize = 400
                        var sampleSize = 1
                        if (options.outWidth > maxSize || options.outHeight > maxSize) {
                            val widthRatio = options.outWidth / maxSize
                            val heightRatio = options.outHeight / maxSize
                            sampleSize = maxOf(widthRatio, heightRatio)
                        }
                        
                        val decodeOptions = BitmapFactory.Options().apply {
                            inSampleSize = sampleSize
                        }
                        val bitmap = BitmapFactory.decodeByteArray(embeddedPicture, 0, embeddedPicture.size, decodeOptions)
                        
                        if (bitmap != null) {
                            val outputStream = ByteArrayOutputStream()
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                            val compressedBytes = outputStream.toByteArray()
                            val base64 = Base64.encodeToString(compressedBytes, Base64.NO_WRAP)
                            bitmap.recycle()
                            
                            promise.resolve(mapOf(
                                "success" to true,
                                "albumArt" to base64
                            ))
                        } else {
                            promise.resolve(mapOf(
                                "success" to false,
                                "error" to "Failed to decode image"
                            ))
                        }
                    } else {
                        promise.resolve(mapOf(
                            "success" to false,
                            "error" to "No embedded album art found"
                        ))
                    }
                } catch (e: Exception) {
                    try { retriever.release() } catch (_: Exception) {}
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to (e.message ?: "Unknown error")
                    ))
                }
            } catch (e: Exception) {
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to (e.message ?: "Unknown error")
                ))
            }
        }
    }
}
