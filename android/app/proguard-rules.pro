# ==============================================================================
# OpenRally Production ProGuard / R8 Optimization & Obfuscation Rules
# ==============================================================================

# Preserve line numbers and source file attributes for readable stack traces in crash logs
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor Core & Plugin Bridge Classes
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keep class com.openrally.app.** { *; }

# Preserve WebView JavaScript Interfaces and annotated methods
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Cordova compatibility plugins
-keep class org.apache.cordova.** { *; }
-keep interface org.apache.cordova.** { *; }

# AndroidX Core, WebKit & AppCompat
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**
-keep class androidx.core.** { *; }
-dontwarn androidx.core.**

