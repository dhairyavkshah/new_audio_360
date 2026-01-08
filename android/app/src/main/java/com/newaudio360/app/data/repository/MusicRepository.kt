package com.newaudio360.app.data.repository

import android.content.ContentResolver
import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.newaudio360.app.data.local.PlaylistDao
import com.newaudio360.app.data.local.SongDao
import com.newaudio360.app.data.model.Playlist
import com.newaudio360.app.data.model.PlaylistEntity
import com.newaudio360.app.data.model.PlaylistSongCrossRef
import com.newaudio360.app.data.model.Song
import com.newaudio360.app.data.model.SongEntity
import com.newaudio360.app.data.model.toPlaylist
import com.newaudio360.app.data.model.toSong
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MusicRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val songDao: SongDao,
    private val playlistDao: PlaylistDao
) {
    val allSongs: Flow<List<Song>> = songDao.getAllSongs().map { it.map { entity -> entity.toSong() } }
    val favoriteSongs: Flow<List<Song>> = songDao.getFavoriteSongs().map { it.map { entity -> entity.toSong() } }
    val recentSongs: Flow<List<Song>> = songDao.getRecentSongs().map { it.map { entity -> entity.toSong() } }
    val topSongs: Flow<List<Song>> = songDao.getTopSongs().map { it.map { entity -> entity.toSong() } }
    val allArtists: Flow<List<String>> = songDao.getAllArtists()
    val allAlbums: Flow<List<String>> = songDao.getAllAlbums()
    val allPlaylists: Flow<List<PlaylistEntity>> = playlistDao.getAllPlaylists()
    val songCount: Flow<Int> = songDao.getSongCount()
    val favoriteCount: Flow<Int> = songDao.getFavoriteCount()

    suspend fun scanDeviceMusic(): Int = withContext(Dispatchers.IO) {
        val songs = mutableListOf<SongEntity>()
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
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.ALBUM_ID
        )

        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} >= 30000"
        val sortOrder = "${MediaStore.Audio.Media.TITLE} ASC"

        context.contentResolver.query(collection, projection, selection, null, sortOrder)?.use { cursor ->
            val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idColumn)
                val title = cursor.getString(titleColumn) ?: "Unknown"
                val artist = cursor.getString(artistColumn) ?: "Unknown Artist"
                val album = cursor.getString(albumColumn) ?: "Unknown Album"
                val duration = cursor.getLong(durationColumn)
                val albumId = cursor.getLong(albumIdColumn)

                val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                val albumArtUri = ContentUris.withAppendedId(
                    Uri.parse("content://media/external/audio/albumart"),
                    albumId
                )

                val existingSong = songDao.getSongByUri(contentUri.toString())
                if (existingSong == null) {
                    songs.add(
                        SongEntity(
                            id = id.toString(),
                            uri = contentUri.toString(),
                            title = title,
                            artist = artist,
                            album = album,
                            duration = duration,
                            albumArtUri = albumArtUri.toString()
                        )
                    )
                }
            }
        }

        if (songs.isNotEmpty()) {
            songDao.insertSongs(songs)
        }
        songs.size
    }

    suspend fun toggleFavorite(songId: String) {
        val song = songDao.getSongById(songId) ?: return
        songDao.setFavorite(songId, !song.isFavorite)
    }

    suspend fun hideSong(songId: String) {
        songDao.setHidden(songId, true)
    }

    suspend fun recordPlay(songId: String) {
        songDao.incrementPlayCount(songId)
    }

    fun searchSongs(query: String): Flow<List<Song>> {
        return songDao.searchSongs(query).map { it.map { entity -> entity.toSong() } }
    }

    fun getSongsByArtist(artist: String): Flow<List<Song>> {
        return songDao.getSongsByArtist(artist).map { it.map { entity -> entity.toSong() } }
    }

    fun getSongsByAlbum(album: String): Flow<List<Song>> {
        return songDao.getSongsByAlbum(album).map { it.map { entity -> entity.toSong() } }
    }

    suspend fun createPlaylist(name: String, description: String? = null): Playlist {
        val playlist = PlaylistEntity(
            id = UUID.randomUUID().toString(),
            name = name,
            description = description
        )
        playlistDao.insertPlaylist(playlist)
        return playlist.toPlaylist()
    }

    suspend fun deletePlaylist(playlistId: String) {
        playlistDao.clearPlaylist(playlistId)
        playlistDao.deletePlaylistById(playlistId)
    }

    suspend fun addSongToPlaylist(playlistId: String, songId: String) {
        val maxPosition = playlistDao.getMaxPosition(playlistId) ?: -1
        playlistDao.addSongToPlaylist(
            PlaylistSongCrossRef(
                playlistId = playlistId,
                songId = songId,
                position = maxPosition + 1
            )
        )
        playlistDao.updatePlaylistTimestamp(playlistId)
    }

    suspend fun removeSongFromPlaylist(playlistId: String, songId: String) {
        playlistDao.removeSongFromPlaylist(playlistId, songId)
        playlistDao.updatePlaylistTimestamp(playlistId)
    }

    suspend fun getPlaylistSongs(playlistId: String): List<Song> {
        val playlistWithSongs = playlistDao.getPlaylistWithSongs(playlistId)
        return playlistWithSongs?.songs?.map { it.toSong() } ?: emptyList()
    }
}
