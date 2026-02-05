package expo.modules.audioeffects

import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.util.Size
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream

class MediaStoreScannerModule : Module() {
    
    companion object {
        private const val TAG = "MediaStoreScanner"
    }
    
    override fun definition() = ModuleDefinition {
        Name("MediaStoreScannerModule")
        
        Function("isAvailable") {
            return@Function true
        }
        
        AsyncFunction("scanAllAudio") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    Log.e(TAG, "Context not available")
                    promise.resolve(mapOf(
                        "success" to false,
                        "error" to "Context not available",
                        "songs" to emptyList<Map<String, Any?>>()
                    ))
                    return@AsyncFunction
                }
                
                Log.d(TAG, "Starting MediaStore audio scan...")
                
                val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                } else {
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
                }
                
                val projection = arrayOf(
                    MediaStore.Audio.Media._ID,
                    MediaStore.Audio.Media.TITLE,
                    MediaStore.Audio.Media.ARTIST,
                    MediaStore.Audio.Media.ALBUM,
                    MediaStore.Audio.Media.ALBUM_ID,
                    MediaStore.Audio.Media.DURATION,
                    MediaStore.Audio.Media.SIZE,
                    MediaStore.Audio.Media.DATE_MODIFIED,
                    MediaStore.Audio.Media.DISPLAY_NAME,
                    MediaStore.Audio.Media.YEAR,
                    MediaStore.Audio.Media.TRACK
                )
                
                val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0"
                val sortOrder = "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"
                
                val songs = mutableListOf<Map<String, Any?>>()
                val albumArtCache = mutableMapOf<Long, String?>()
                
                context.contentResolver.query(
                    collection,
                    projection,
                    selection,
                    null,
                    sortOrder
                )?.use { cursor ->
                    val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                    val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                    val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
                    val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
                    val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
                    val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                    val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                    val dateModifiedColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
                    val displayNameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
                    val yearColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.YEAR)
                    val trackColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TRACK)
                    
                    Log.d(TAG, "Found ${cursor.count} audio files")
                    
                    while (cursor.moveToNext()) {
                        try {
                            val id = cursor.getLong(idColumn)
                            val title = cursor.getString(titleColumn) ?: "Unknown Title"
                            val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
                            val album = cursor.getString(albumColumn) ?: "Unknown Album"
                            val albumId = cursor.getLong(albumIdColumn)
                            var duration = cursor.getLong(durationColumn)
                            val size = cursor.getLong(sizeColumn)
                            val dateModified = cursor.getLong(dateModifiedColumn)
                            val displayName = cursor.getString(displayNameColumn) ?: ""
                            val year = cursor.getInt(yearColumn)
                            val track = cursor.getInt(trackColumn)
                            
                            val contentUri = ContentUris.withAppendedId(
                                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                                id
                            )
                            
                            // Fallback: If MediaStore returns 0 duration, use MediaMetadataRetriever
                            if (duration <= 0) {
                                duration = getDurationWithRetriever(context, contentUri)
                            }
                            
                            var albumArt: String? = null
                            if (albumArtCache.containsKey(albumId)) {
                                albumArt = albumArtCache[albumId]
                            } else {
                                albumArt = loadAlbumArt(context, albumId, contentUri)
                                albumArtCache[albumId] = albumArt
                            }
                            
                            songs.add(mapOf(
                                "id" to id.toString(),
                                "title" to title,
                                "artist" to artist,
                                "album" to album,
                                "albumId" to albumId.toString(),
                                "duration" to duration,
                                "size" to size,
                                "dateModified" to dateModified,
                                "filename" to displayName,
                                "year" to if (year > 0) year else null,
                                "track" to if (track > 0) track else null,
                                "uri" to contentUri.toString(),
                                "albumArt" to albumArt
                            ))
                        } catch (e: Exception) {
                            Log.w(TAG, "Error processing song: ${e.message}")
                        }
                    }
                }
                
                Log.d(TAG, "Scan complete. Found ${songs.size} songs with metadata")
                
                promise.resolve(mapOf(
                    "success" to true,
                    "count" to songs.size,
                    "songs" to songs
                ))
                
            } catch (e: Exception) {
                Log.e(TAG, "Error scanning audio: ${e.message}", e)
                promise.resolve(mapOf(
                    "success" to false,
                    "error" to (e.message ?: "Unknown error"),
                    "songs" to emptyList<Map<String, Any?>>()
                ))
            }
        }
        
        AsyncFunction("getAlbumArt") { albumId: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(mapOf("success" to false, "albumArt" to null))
                    return@AsyncFunction
                }
                
                val albumIdLong = albumId.toLongOrNull() ?: run {
                    promise.resolve(mapOf("success" to false, "albumArt" to null))
                    return@AsyncFunction
                }
                
                val albumArt = loadAlbumArt(context, albumIdLong, null)
                promise.resolve(mapOf(
                    "success" to (albumArt != null),
                    "albumArt" to albumArt
                ))
            } catch (e: Exception) {
                promise.resolve(mapOf("success" to false, "albumArt" to null))
            }
        }
    }
    
    /**
     * Fallback duration fetching using MediaMetadataRetriever when MediaStore returns 0.
     * This handles cases where MediaStore hasn't fully indexed the file yet.
     */
    private fun getDurationWithRetriever(context: android.content.Context, uri: Uri): Long {
        val retriever = android.media.MediaMetadataRetriever()
        try {
            retriever.setDataSource(context, uri)
            val durationStr = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)
            return durationStr?.toLongOrNull() ?: 0L
        } catch (e: Exception) {
            Log.d(TAG, "MediaMetadataRetriever fallback failed for $uri: ${e.message}")
            return 0L
        } finally {
            try {
                retriever.release()
            } catch (e: Exception) {
                // Ignore release errors
            }
        }
    }
    
    private fun loadAlbumArt(context: android.content.Context, albumId: Long, audioUri: Uri?): String? {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val albumUri = ContentUris.withAppendedId(
                    MediaStore.Audio.Albums.EXTERNAL_CONTENT_URI,
                    albumId
                )
                val bitmap = context.contentResolver.loadThumbnail(
                    albumUri,
                    Size(300, 300),
                    null
                )
                return bitmapToBase64(bitmap)
            } else {
                return loadAlbumArtLegacy(context, albumId, audioUri)
            }
        } catch (e: Exception) {
            Log.d(TAG, "loadThumbnail failed for album $albumId, trying fallback")
            return loadAlbumArtLegacy(context, albumId, audioUri)
        }
    }
    
    private fun loadAlbumArtLegacy(context: android.content.Context, albumId: Long, audioUri: Uri?): String? {
        try {
            @Suppress("DEPRECATION")
            val projection = arrayOf(MediaStore.Audio.Albums.ALBUM_ART)
            
            context.contentResolver.query(
                MediaStore.Audio.Albums.EXTERNAL_CONTENT_URI,
                projection,
                "${MediaStore.Audio.Albums._ID} = ?",
                arrayOf(albumId.toString()),
                null
            )?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val artPath = cursor.getString(0)
                    if (artPath != null) {
                        val bitmap = BitmapFactory.decodeFile(artPath)
                        if (bitmap != null) {
                            return bitmapToBase64(scaleBitmap(bitmap, 300))
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "Legacy album art failed: ${e.message}")
        }
        
        if (audioUri != null) {
            val retriever = android.media.MediaMetadataRetriever()
            try {
                retriever.setDataSource(context, audioUri)
                val art = retriever.embeddedPicture
                
                if (art != null && art.isNotEmpty()) {
                    val bitmap = BitmapFactory.decodeByteArray(art, 0, art.size)
                    if (bitmap != null) {
                        return bitmapToBase64(scaleBitmap(bitmap, 300))
                    }
                }
            } catch (e: Exception) {
                Log.d(TAG, "MediaMetadataRetriever fallback failed: ${e.message}")
            } finally {
                try { retriever.release() } catch (_: Exception) {}
            }
        }
        
        return null
    }
    
    private fun scaleBitmap(bitmap: Bitmap, maxSize: Int): Bitmap {
        if (bitmap.width <= maxSize && bitmap.height <= maxSize) {
            return bitmap
        }
        
        val ratio = minOf(
            maxSize.toFloat() / bitmap.width,
            maxSize.toFloat() / bitmap.height
        )
        
        val width = (bitmap.width * ratio).toInt()
        val height = (bitmap.height * ratio).toInt()
        
        return Bitmap.createScaledBitmap(bitmap, width, height, true)
    }
    
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val scaledBitmap = scaleBitmap(bitmap, 300)
        val outputStream = ByteArrayOutputStream()
        return try {
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            val bytes = outputStream.toByteArray()
            "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
        } finally {
            try { outputStream.close() } catch (_: Exception) {}
        }
    }
}
