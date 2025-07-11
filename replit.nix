{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.python311Packages.setuptools
    pkgs.python311Packages.wheel
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.nodePackages.yarn
    pkgs.nodePackages.typescript
    pkgs.nodePackages.typescript-language-server
    pkgs.python311Packages.python-lsp-server
    pkgs.mongodb
    pkgs.curl
    pkgs.git
  ];
  
  env = {
    PYTHON_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.python311
      pkgs.python311Packages.pip
    ];
    PYTHONPATH = "${pkgs.python311}/lib/python3.11/site-packages";
    NODE_PATH = "${pkgs.nodejs_20}/lib/node_modules";
  };
}