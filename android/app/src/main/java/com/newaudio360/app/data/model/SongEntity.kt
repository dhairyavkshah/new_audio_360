package com.newaudio360.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "songs")
data class SongEntity(
    @PrimaryKey
    val id: String,
    val uri: String,
    val title: String,
    val artist: String,
    val album: String,
    val duration: Long,
    val albumArtUri: String?,
    val isFavorite: Boolean = false,
    val isHidden: Boolean = false,
    val playCount: Int = 0,
    val lastPlayedAt: Long? = null,
    val addedAt: Long = System.currentTimeMillis()
)

data class Song(
    val id: String,
    val uri: String,
    val title: String,
    val artist: String,
    val album: String,
    val duration: Long,
    val albumArtUri: String?,
    val isFavorite: Boolean = false,
    val playCount: Int = 0,
    val lastPlayedAt: Long? = null
)

fun SongEntity.toSong() = Song(
    id = id,
    uri = uri,
    title = title,
    artist = artist,
    album = album,
    duration = duration,
    albumArtUri = albumArtUri,
    isFavorite = isFavorite,
    playCount = playCount,
    lastPlayedAt = lastPlayedAt
)

fun Song.toEntity() = SongEntity(
    id = id,
    uri = uri,
    title = title,
    artist = artist,
    album = album,
    duration = duration,
    albumArtUri = albumArtUri,
    isFavorite = isFavorite,
    playCount = playCount,
    lastPlayedAt = lastPlayedAt
)
