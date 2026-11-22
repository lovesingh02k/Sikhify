package `in`.sikhify.sikhify

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var links: MethodChannel? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // No screenshots or screen recording anywhere in the app (they show black), and the
        // app's preview in the recent-apps list is hidden too.
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // "Share App" sends the app itself: Flutter asks where the installed APK is and shares a copy of it.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "in.sikhify.app/apk").setMethodCallHandler { call, result ->
            when (call.method) {
                "apkPath" -> result.success(applicationInfo.sourceDir)
                // More than one file means the app came from an app store in parts; one APK alone wouldn't install.
                "isSplit" -> result.success(!applicationInfo.splitSourceDirs.isNullOrEmpty())
                else -> result.notImplemented()
            }
        }
        // Shared links (a friend's quiz): the link that started the app, and links that arrive while it is open.
        links = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "in.sikhify.app/links").apply {
            setMethodCallHandler { call, result ->
                when (call.method) {
                    "initialLink" -> {
                        result.success(intent?.takeIf { it.action == Intent.ACTION_VIEW }?.dataString)
                        intent?.data = null // handled once, not again after a screen rotation
                    }
                    else -> result.notImplemented()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.action == Intent.ACTION_VIEW) intent.dataString?.let { links?.invokeMethod("link", it) }
    }
}
