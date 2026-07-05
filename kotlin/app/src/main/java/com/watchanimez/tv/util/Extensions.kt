package com.watchanimez.tv.util

import android.widget.ImageView
import coil.load
import coil.transform.RoundedCornersTransformation

fun ImageView.loadPoster(url: String?, cornerRadius: Float = 8f) {
    load(url) {
        crossfade(true)
        transformations(RoundedCornersTransformation(cornerRadius))
        error(android.R.color.darker_gray)
    }
}
