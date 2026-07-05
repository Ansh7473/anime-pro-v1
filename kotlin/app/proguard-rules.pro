# Retrofit
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keep,includedescriptorclasses class com.watchanimez.tv.data.model.**$$serializer { *; }
-keepclassmembers class com.watchanimez.tv.data.model.** {
    *** Companion;
}
-keepclasseswithmembers class com.watchanimez.tv.data.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}
