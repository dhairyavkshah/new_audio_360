package com.newaudio360.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.newaudio360.app.data.model.SongEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SongDao {
    @Query("SELECT * FROM songs WHERE isHidden = 0 ORDER BY title ASC")
    fun getAllSongs(): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE isHidden = 0 ORDER BY lastPlayedAt DESC LIMIT :limit")
    fun getRecentSongs(limit: Int = 50): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE isHidden = 0 ORDER BY playCount DESC LIMIT :limit")
    fun getTopSongs(limit: Int = 50): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE isFavorite = 1 AND isHidden = 0 ORDER BY title ASC")
    fun getFavoriteSongs(): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE id = :id")
    suspend fun getSongById(id: String): SongEntity?

    @Query("SELECT * FROM songs WHERE uri = :uri")
    suspend fun getSongByUri(uri: String): SongEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSong(song: SongEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSongs(songs: List<SongEntity>)

    @Update
    suspend fun updateSong(song: SongEntity)

    @Query("UPDATE songs SET isFavorite = :isFavorite WHERE id = :id")
    suspend fun setFavorite(id: String, isFavorite: Boolean)

    @Query("UPDATE songs SET isHidden = :isHidden WHERE id = :id")
    suspend fun setHidden(id: String, isHidden: Boolean)

    @Query("UPDATE songs SET playCount = playCount + 1, lastPlayedAt = :timestamp WHERE id = :id")
    suspend fun incrementPlayCount(id: String, timestamp: Long = System.currentTimeMillis())

    @Query("SELECT DISTINCT artist FROM songs WHERE isHidden = 0 ORDER BY artist ASC")
    fun getAllArtists(): Flow<List<String>>

    @Query("SELECT DISTINCT album FROM songs WHERE isHidden = 0 ORDER BY album ASC")
    fun getAllAlbums(): Flow<List<String>>

    @Query("SELECT * FROM songs WHERE artist = :artist AND isHidden = 0 ORDER BY title ASC")
    fun getSongsByArtist(artist: String): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE album = :album AND isHidden = 0 ORDER BY title ASC")
    fun getSongsByAlbum(album: String): Flow<List<SongEntity>>

    @Query("SELECT * FROM songs WHERE isHidden = 0 AND (title LIKE '%' || :query || '%' OR artist LIKE '%' || :query || '%' OR album LIKE '%' || :query || '%') ORDER BY title ASC")
    fun searchSongs(query: String): Flow<List<SongEntity>>

    @Query("SELECT COUNT(*) FROM songs WHERE isHidden = 0")
    fun getSongCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM songs WHERE isFavorite = 1 AND isHidden = 0")
    fun getFavoriteCount(): Flow<Int>
}
