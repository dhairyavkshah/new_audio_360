package com.newaudio360.app.data.model

import androidx.room.Entity
import androidx.room.Junction
import androidx.room.PrimaryKey
import androidx.room.Relation

@Entity(tableName = "playlists")
data class PlaylistEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String? = null,
    val coverArtUri: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "playlist_song_cross_ref",
    primaryKeys = ["playlistId", "songId"]
)
data class PlaylistSongCrossRef(
    val playlistId: String,
    val songId: String,
    val position: Int,
    val addedAt: Long = System.currentTimeMillis()
)

data class PlaylistWithSongs(
    val playlist: PlaylistEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "id",
        associateBy = Junction(
            value = PlaylistSongCrossRef::class,
            parentColumn = "playlistId",
            entityColumn = "songId"
        )
    )
    val songs: List<SongEntity>
)

data class Playlist(
    val id: String,
    val name: String,
    val description: String?,
    val coverArtUri: String?,
    val songCount: Int = 0,
    val createdAt: Long,
    val updatedAt: Long
)

fun PlaylistEntity.toPlaylist(songCount: Int = 0) = Playlist(
    id = id,
    name = name,
    description = description,
    coverArtUri = coverArtUri,
    songCount = songCount,
    createdAt = createdAt,
    updatedAt = updatedAt
)
