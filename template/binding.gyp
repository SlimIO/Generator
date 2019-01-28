{
    "targets": [
        {
            "target_name": "<(module_name)",
            "sources": [],
            "include_dirs": [
                "include",
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            "dependencies": [
                "<!(node -p \"require('node-addon-api').gyp\")"
            ]
        }
    ]
}
