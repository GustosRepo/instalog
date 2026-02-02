#!/bin/bash
# Quick fix to add WidgetPresetsModule to Xcode project

cd "$(dirname "$0")/ios"

echo "🔧 Adding WidgetPresetsModule files to Xcode..."

# Add files using ruby script
ruby << 'EOF'
require 'xcodeproj'

project_path = 'Instalog.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'Instalog' }

# Get the Instalog group
instalog_group = project.main_group.groups.find { |g| g.name == 'Instalog' } || project.main_group.new_group('Instalog')

# Add files if they don't exist
swift_file = instalog_group.files.find { |f| f.path == 'WidgetPresetsModule.swift' }
objc_file = instalog_group.files.find { |f| f.path == 'WidgetPresetsModule.m' }

unless swift_file
  swift_ref = instalog_group.new_file('Instalog/WidgetPresetsModule.swift')
  target.source_build_phase.add_file_reference(swift_ref)
  puts "✅ Added WidgetPresetsModule.swift"
end

unless objc_file
  objc_ref = instalog_group.new_file('Instalog/WidgetPresetsModule.m')
  target.source_build_phase.add_file_reference(objc_ref)
  puts "✅ Added WidgetPresetsModule.m"
end

project.save
puts "✅ Project saved"
EOF

echo "🎉 Done! Now run: npm run ios"
