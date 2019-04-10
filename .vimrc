" very minimalist vimrc based on my own
set nocompatible " do not make vim compatible with vi.
set backspace=2 " backspace in insert mode works like normal editor
syntax on " syntax highlighting
filetype indent on " activates indenting for files
set autoindent " auto indenting
set number " line numbers
colorscheme desert
set nobackup " get rid of anoying ~file
set cursorline " show location of cursor using a horizontal line.
set noswapfile
set hlsearch " highlight found words on search

" change cursor shape for insert mode
let &t_SI = "\<Esc>]50;CursorShape=1\x7"
let &t_EI = "\<Esc>]50;CursorShape=0\x7"

"white space highlighting
highlight ExtraWhitespace ctermbg=blue
